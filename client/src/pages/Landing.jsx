import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Landing() {
  const { user } = useAuth();
  return (
    <>
      <section className="hero">
        <div className="hero-orb" aria-hidden="true" />
        <p className="eyebrow">Web 3D Game · Three.js</p>
        <h1>Catch the glowing orbs.<br />Dodge the bombs.</h1>
        <p className="lead">
          Orb Rush is a fast 3D target game. Click the moving crystals in a live Three.js arena,
          survive 9 rounds across 3 levels, and climb your personal leaderboard.
        </p>
        <div className="cta">
          {user ? (
            <Link to="/game" className="btn btn-primary">Play now</Link>
          ) : (
            <>
              <Link to="/signup" className="btn btn-primary">Create free account</Link>
              <Link to="/login" className="btn btn-ghost">Login</Link>
            </>
          )}
        </div>
      </section>
      <section className="features">
        {[
          ['3D arena', 'A real-time Three.js scene with lighting, bouncing objects and instant visual feedback.'],
          ['Rounds & levels', 'Nine rounds, three levels. More targets, less time and faster objects as you progress.'],
          ['Your stats', 'Every game is saved to your account: best score, highest level and full history.'],
        ].map(([t, d]) => (
          <article className="card" key={t}><h3>{t}</h3><p className="muted">{d}</p></article>
        ))}
      </section>
    </>
  );
}
