import * as THREE from 'three';

// Arena limits (world units). Targets bounce inside this box.
const BX = 7, BZ = 3, YMIN = 0.8, YMAX = 5.5;
const SPEED_UNIT = 2.5;
const POP_TIME = 0.35;

/**
 * Pure Three.js layer. It knows nothing about React or scoring:
 * it only reports what the player clicked through the onHit / onBomb / onMiss callbacks.
 */
export class GameScene {
  constructor(container, { onHit, onBomb, onMiss }) {
    this.container = container;
    this.cb = { onHit, onBomb, onMiss };
    this.interactive = false; // raycasting allowed?
    this.moving = false;      // targets animate?
    this.targets = [];        // only ALIVE, clickable meshes live here
    this.effects = [];        // meshes playing the "pop" animation
    this.hovered = null;

    // --- Scene, camera, renderer ---
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b1020);
    this.scene.fog = new THREE.Fog(0x0b1020, 22, 45);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const dom = this.renderer.domElement;
    dom.style.touchAction = 'none'; // stop the page from scrolling while playing on touch screens
    container.appendChild(dom);

    // --- Lights (no shadows: cheaper on student laptops) ---
    this.scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x1a1f3a, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(5, 10, 7);
    this.scene.add(sun);

    // --- Environment ---
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    this.scene.add(floor, new THREE.GridHelper(40, 40, 0x3b82f6, 0x1e293b));

    // --- Shared geometries & materials (created once, reused by every target) ---
    this.geo = { target: new THREE.OctahedronGeometry(0.6), bomb: new THREE.SphereGeometry(0.55, 20, 14) };
    this.mat = {
      target: new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0e7490, metalness: 0.35, roughness: 0.25 }),
      targetHover: new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xca8a04, metalness: 0.35, roughness: 0.25 }),
      bomb: new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x7f1d1d, metalness: 0.2, roughness: 0.4 }),
      bombHover: new THREE.MeshStandardMaterial({ color: 0xfb923c, emissive: 0x9a3412, metalness: 0.2, roughness: 0.4 }),
    };

    // Decorative object shown on the start screen
    this.decor = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.3, 0.38, 120, 16),
      new THREE.MeshStandardMaterial({ color: 0xa78bfa, emissive: 0x4c1d95, metalness: 0.4, roughness: 0.3 })
    );
    this.decor.position.set(0, 2.8, 0);
    this.scene.add(this.decor);

    // --- Raycasting helpers ---
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this._onMove = this._onMove.bind(this);
    this._onDown = this._onDown.bind(this);
    this._onLeave = this._onLeave.bind(this);
    dom.addEventListener('pointermove', this._onMove);
    dom.addEventListener('pointerdown', this._onDown);
    dom.addEventListener('pointerleave', this._onLeave);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();

    this.clock = new THREE.Clock();
    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
  }

  // ---------- public API used by React ----------
  setStatus(status) {
    this.interactive = status === 'playing';
    this.moving = status === 'playing';
    this.decor.visible = status === 'ready';
    if (!this.interactive) this._setHover(null);
    if (status === 'ready') this.clearTargets();
  }

  spawnRound(cfg) {
    this.clearTargets();
    for (let i = 0; i < cfg.targets; i++) this._spawn('target', cfg.speed);
    for (let i = 0; i < cfg.bombs; i++) this._spawn('bomb', cfg.speed);
  }

  clearTargets() {
    this._setHover(null);
    for (const m of this.targets) this.scene.remove(m);
    this.targets.length = 0;
    for (const e of this.effects) { this.scene.remove(e.mesh); e.mesh.material.dispose(); }
    this.effects.length = 0;
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false); // CSS controls the displayed size
    this.camera.aspect = w / h;
    // On tall/narrow screens move the camera back so the whole arena stays visible
    const need = (16 / this.camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    this.camera.position.set(0, 5, Math.max(14.5, need));
    this.camera.lookAt(0, 2.5, 0);
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    this.ro.disconnect();
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointermove', this._onMove);
    dom.removeEventListener('pointerdown', this._onDown);
    dom.removeEventListener('pointerleave', this._onLeave);
    this.clearTargets();
    this.scene.traverse((o) => {
      o.geometry?.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      mats.forEach((m) => m.dispose());
    });
    Object.values(this.geo).forEach((g) => g.dispose());
    Object.values(this.mat).forEach((m) => m.dispose());
    this.renderer.dispose();
    dom.remove();
  }

  // ---------- raycasting ----------
  // 1) pixel position -> normalized device coordinates (-1..+1) relative to the CANVAS, not the window
  // 2) setFromCamera shoots a ray from the camera through that point
  // 3) intersectObjects returns the clickable meshes the ray hits, nearest first
  _pick(e) {
    if (!this.interactive) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.targets, false);
    return hits.length ? hits[0].object : null;
  }

  _onMove(e) {
    if (e.pointerType !== 'mouse') return; // hover only makes sense with a mouse
    this._setHover(this._pick(e));
  }

  _onLeave() { this._setHover(null); }

  _onDown(e) {
    if (!this.interactive) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return; // left button only
    const obj = this._pick(e);
    if (!obj) { this.cb.onMiss(); return; }
    this._collect(obj);
  }

  _collect(obj) {
    // Remove from the clickable list FIRST -> the same object can never score twice
    const i = this.targets.indexOf(obj);
    if (i === -1) return;
    this.targets.splice(i, 1);
    if (this.hovered === obj) this._setHover(null);
    const kind = obj.userData.kind;
    obj.material = obj.material.clone(); // own copy so we can fade it without touching shared materials
    obj.material.transparent = true;
    this.effects.push({ mesh: obj, t: 0 });
    if (kind === 'target') this.cb.onHit(); else this.cb.onBomb();
  }

  _setHover(obj) {
    if (this.hovered === obj) return;
    if (this.hovered) this.hovered.material = this.hovered.userData.base; // restore original look
    this.hovered = obj;
    if (obj) obj.material = obj.userData.hover;
    this.renderer.domElement.style.cursor = obj ? 'pointer' : 'default';
  }

  // ---------- internals ----------
  _spawn(kind, speed) {
    const isTarget = kind === 'target';
    const m = new THREE.Mesh(this.geo[kind], isTarget ? this.mat.target : this.mat.bomb);
    m.userData = { kind, base: m.material, hover: isTarget ? this.mat.targetHover : this.mat.bombHover, vel: new THREE.Vector3() };
    m.position.set(rand(-BX, BX), rand(YMIN + 0.3, YMAX - 0.3), rand(-BZ, BZ));
    m.userData.vel.set(rand(-1, 1), rand(-0.6, 0.6), rand(-0.5, 0.5)).normalize().multiplyScalar(speed * SPEED_UNIT);
    this.scene.add(m);
    this.targets.push(m);
  }

  _loop() {
    this._raf = requestAnimationFrame(this._loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.decor.visible) { this.decor.rotation.x += dt * 0.6; this.decor.rotation.y += dt * 0.9; }

    if (this.moving) {
      for (const m of this.targets) {
        const v = m.userData.vel, p = m.position;
        p.addScaledVector(v, dt);
        if (p.x > BX || p.x < -BX) { v.x = -v.x; p.x = Math.max(-BX, Math.min(BX, p.x)); }
        if (p.y > YMAX || p.y < YMIN) { v.y = -v.y; p.y = Math.max(YMIN, Math.min(YMAX, p.y)); }
        if (p.z > BZ || p.z < -BZ) { v.z = -v.z; p.z = Math.max(-BZ, Math.min(BZ, p.z)); }
        m.rotation.y += dt * 1.2;
        m.rotation.x += dt * 0.6;
      }
    }

    // "Pop" animation: grow and fade, then free the temporary material
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.t += dt;
      e.mesh.scale.setScalar(1 + (e.t / POP_TIME) * 1.5);
      e.mesh.material.opacity = Math.max(0, 1 - e.t / POP_TIME);
      if (e.t >= POP_TIME) {
        this.scene.remove(e.mesh);
        e.mesh.material.dispose();
        this.effects.splice(i, 1);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

const rand = (a, b) => a + Math.random() * (b - a);
