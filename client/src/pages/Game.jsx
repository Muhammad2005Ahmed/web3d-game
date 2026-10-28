import { useEffect, useReducer, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { GameScene } from '../game/GameScene.js';
import { gameReducer, initialState, roundConfig, toResult, accuracy, TOTAL_ROUNDS } from '../game/gameLogic.js';

export default function Game() {
  const [s, dispatch] = useReducer(gameReducer, undefined, () => initialState());
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const savedFor = useRef(null);
  const [save, setSave] = useState({ status: 'idle', message: '' });
  const [best, setBest] = useState(null);
  const cfg = roundConfig(s.round);

  // 1) Create the Three.js scene once; dispose it when leaving the page
  useEffect(() => {
    const scene = new GameScene(mountRef.current, {
      onHit: () => dispatch({ type: 'HIT' }),
      onBomb: () => dispatch({ type: 'BOMB' }),
      onMiss: () => dispatch({ type: 'MISS' }),
    });
    sceneRef.current = scene;
    return () => { scene.dispose(); sceneRef.current = null; };
  }, []);

  // 2) Tell the scene what state the game is in (enables/disables raycasting & movement)
  useEffect(() => { sceneRef.current?.setStatus(s.status); }, [s.status]);

  // 3) Spawn objects whenever a new round starts
  useEffect(() => {
    if (s.roundKey > 0) sceneRef.current?.spawnRound(roundConfig(s.round));
  }, [s.roundKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // 4) Countdown timer - only runs while playing
  useEffect(() => {
    if (s.status !== 'playing') return;
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(id);
  }, [s.status]);

  // 5) Save the result once per game session (server also rejects duplicates)
  const saveResult = useCallback(async (state) => {
    setSave({ status: 'saving', message: '' });
    try {
      await api('/games', { method: 'POST', body: toResult(state) });
      setSave({ status: 'saved', message: '' });
      const stats = await api('/games/stats');
      setBest(stats.bestScore);
    } catch (e) {
      savedFor.current = null; // allow retry
      setSave({ status: 'error', message: e.message });
    }
  }, []);

  useEffect(() => {
    if (s.status !== 'gameOver' || savedFor.current === s.sessionId) return;
    savedFor.current = s.sessionId;
    saveResult(s);
  }, [s.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard: P pauses/resumes
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() !== 'p') return;
      dispatch({ type: s.status === 'paused' ? 'RESUME' : 'PAUSE' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s.status]);

  const playAgain = () => { setSave({ status: 'idle', message: '' }); setBest(null); dispatch({ type: 'RESET' }); dispatch({ type: 'START' }); };
  const isRecord = save.status === 'saved' && best !== null && s.score > 0 && s.score >= best;

  return (
    <>
      <h1>Orb Rush</h1>
      <div className="hud" aria-live="polite">
        <div><span>Score</span><strong>{s.score}</strong></div>
        <div><span>Level</span><strong>{cfg.level}/3</strong></div>
        <div><span>Round</span><strong>{s.round + 1}/{TOTAL_ROUNDS}</strong></div>
        <div><span>Orbs left</span><strong>{cfg.targets - s.collected}</strong></div>
        <div className={s.status === 'playing' && s.timeLeft <= 5 ? 'danger' : ''}><span>Time</span><strong>{s.timeLeft}s</strong></div>
      </div>

      <div className="game-grid">
        <div className="canvas-wrap">
          <div ref={mountRef} className="canvas-mount" />

          {s.status === 'ready' && (
            <div className="overlay"><h2>Ready?</h2>
              <p>Click the <b className="cyan">cyan crystals</b> (+10). Avoid the <b className="red">red bombs</b> (−5). Clear every crystal before time runs out.</p>
              <button className="btn btn-primary" onClick={() => dispatch({ type: 'START' })}>Start game</button>
            </div>
          )}
          {s.status === 'paused' && (
            <div className="overlay"><h2>Paused</h2><button className="btn btn-primary" onClick={() => dispatch({ type: 'RESUME' })}>Resume</button></div>
          )}
          {s.status === 'roundComplete' && (
            <div className="overlay"><h2>Round {s.round + 1} complete!</h2>
              <p>Time bonus <b>+{s.lastBonus}</b></p>
              <p className="muted">Next: level {roundConfig(s.round + 1).level} · {roundConfig(s.round + 1).targets} orbs · {roundConfig(s.round + 1).time}s</p>
              <button className="btn btn-primary" onClick={() => dispatch({ type: 'NEXT_ROUND' })}>Next round</button>
            </div>
          )}
          {s.status === 'gameOver' && (
            <div className="overlay"><h2>{s.won ? 'You cleared every round! 🏆' : "Time's up!"}</h2>
              <p>Final score <b>{s.score}</b></p>
              <SaveNote save={save} onRetry={() => saveResult(s)} />
              <button className="btn btn-primary" onClick={() => dispatch({ type: 'SHOW_RESULTS' })}>View scorecard</button>
            </div>
          )}
          {s.status === 'results' && (
            <div className="overlay"><h2>Scorecard</h2>
              <dl className="scorecard">
                <div><dt>Final score</dt><dd>{s.score}</dd></div>
                <div><dt>Personal best</dt><dd>{best ?? '…'}</dd></div>
                <div><dt>Rounds completed</dt><dd>{s.roundsCompleted}/{TOTAL_ROUNDS}</dd></div>
                <div><dt>Highest level</dt><dd>{toResult(s).levelReached}</dd></div>
                <div><dt>Accuracy</dt><dd>{accuracy(s)}%</dd></div>
                <div><dt>Time played</dt><dd>{s.elapsed}s</dd></div>
              </dl>
              {isRecord && <p className="ok">🎉 New personal best!</p>}
              <SaveNote save={save} onRetry={() => saveResult(s)} />
              <div className="cta">
                <button className="btn btn-primary" onClick={playAgain}>Play again</button>
                <Link to="/dashboard" className="btn btn-ghost">Dashboard</Link>
              </div>
            </div>
          )}
        </div>

        <aside className="card side">
          <h2>Controls</h2>
          <div className="cta col">
            {s.status === 'playing' && <button className="btn btn-ghost" onClick={() => dispatch({ type: 'PAUSE' })}>Pause (P)</button>}
            {s.status === 'paused' && <button className="btn btn-ghost" onClick={() => dispatch({ type: 'RESUME' })}>Resume (P)</button>}
            {s.status !== 'ready' && s.status !== 'results' && <button className="btn btn-ghost" onClick={() => dispatch({ type: 'RESET' })}>Restart</button>}
          </div>
          <h2>How to play</h2>
          <ul className="small muted">
            <li>Click or tap objects directly in the 3D scene.</li>
            <li>Cyan crystal: +10 points.</li>
            <li>Red bomb: −5 points.</li>
            <li>Finish a round early for +2 points per second left.</li>
            <li>9 rounds, 3 levels – each one is harder.</li>
          </ul>
          <p className="small">Mouse hover highlights what you can click.</p>
        </aside>
      </div>
    </>
  );
}

function SaveNote({ save, onRetry }) {
  if (save.status === 'saving') return <p className="muted small" role="status">Saving result…</p>;
  if (save.status === 'saved') return <p className="ok small" role="status">Result saved to your account ✔</p>;
  if (save.status === 'error')
    return <p className="error small" role="alert">Could not save: {save.message} <button className="linklike" onClick={onRetry}>Retry</button></p>;
  return null;
}
