# Viva preparation - Orb Rush

1. **What is Three.js?** A JavaScript library over WebGL that lets us build 3D scenes without writing low-level shader code.
2. **Scene, camera, renderer?** Scene = container of objects/lights; camera = the viewpoint (PerspectiveCamera); renderer = draws the scene to a `<canvas>` every frame.
3. **Why `requestAnimationFrame`?** It runs the loop in sync with the screen refresh and pauses in background tabs. Our loop moves targets using `dt` (delta time) so speed is the same on every computer.
4. **What is raycasting?** Shooting an invisible ray from the camera through the mouse position and finding which 3D objects it hits.
5. **What are normalized device coordinates?** Screen position mapped to −1…+1 on both axes: `x = (clientX-rect.left)/rect.width*2-1`, `y = -(clientY-rect.top)/rect.height*2+1`. We use the canvas rectangle, not the window, so layout doesn't break clicks.
6. **Role of `THREE.Vector2` and `Raycaster`?** Vector2 stores the NDC pointer; `raycaster.setFromCamera(pointer,camera)` builds the ray; `intersectObjects(targets)` returns hits sorted nearest first.
7. **How do we avoid double scoring?** The clicked mesh is removed from the `targets` array immediately, so it can't be hit again; the reducer also ignores `HIT` unless status is `playing`.
8. **Materials & lighting used?** `MeshStandardMaterial` (reacts to light) for objects, a HemisphereLight for ambient fill and a DirectionalLight as sun. Shadows are off for performance. Hover swaps to a highlight material and then restores the original.
9. **How is performance handled?** Geometries/materials are created once and shared, no allocation inside the frame loop, pixel ratio capped at 2, no shadows/post-processing.
10. **How do we clean up?** On leaving the page: cancel the animation frame, remove event listeners, disconnect `ResizeObserver`, dispose geometries/materials and the renderer, remove the canvas.
11. **How is game state managed?** `useReducer` with a pure reducer (`gameLogic.js`): ready, playing, paused, roundComplete, gameOver, results. Wrong transitions return the same state. The Three.js layer only reports clicks; scoring lives in the reducer.
12. **How do frontend and backend talk?** REST + JSON via `fetch` in `api.js`; the JWT is sent in the `Authorization: Bearer` header; the base URL comes from `VITE_API_URL`.
13. **Database design?** Two collections: `users` and `gamesessions` (each session references its user). Unique index on `(user, clientSessionId)` prevents duplicate saves; stats are computed with an aggregation.
14. **How does authentication work?** Register/login return a JWT (7 days). `requireAuth` middleware verifies it on every private route and sets `req.userId`; queries always filter by that id, so users see only their own data.
15. **Why hash passwords? Why bcrypt?** If the DB leaks, plaintext passwords would be exposed. bcrypt is slow and salted on purpose, which makes brute force expensive. Cost factor 12.
16. **Why validate on the server too?** Frontend checks can be bypassed (Postman, DevTools). The server validates types, lengths, formats and game rules, and rejects anything unexpected.
17. **What is rate limiting?** Limiting requests per IP in a time window. Login/register allow 10 attempts per 15 minutes to slow brute-force attacks.
18. **Can players cheat?** Client scores can't be fully trusted. The server checks that score, hits and level are possible for the rounds completed and rejects impossible values; true prevention would require running the game on the server.
19. **How do we prevent SQL/NoSQL injection and XSS?** Mongoose with object queries, strict type checks (reject `{"$gt":""}`), and React's automatic output escaping.
20. **How is the app deployed?** MongoDB Atlas (DB), Render (Express API), Vercel (React build). Env vars hold secrets, `CLIENT_ORIGIN` configures CORS and `VITE_API_URL` points the frontend at the API.
