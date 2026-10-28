import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatCard from '../components/StatCard.jsx';
import { Loading, ErrorBox } from '../components/Status.jsx';
import { formatDate } from '../utils/validators.js';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError(''); setData(null);
    Promise.all([api('/games/stats'), api('/games?limit=5')])
      .then(([stats, h]) => setData({ stats, recent: h.sessions }))
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  return (
    <>
      <h1>Welcome, {user.username} 👋</h1>
      {error && <ErrorBox message={error} onRetry={load} />}
      {!error && !data && <Loading text="Loading your stats…" />}
      {data && (
        <>
          <div className="grid-4">
            <StatCard label="Total games" value={data.stats.totalGames} />
            <StatCard label="Best score" value={data.stats.bestScore} />
            <StatCard label="Highest level" value={data.stats.highestLevel || '–'} hint="out of 3" />
            <StatCard label="Average score" value={data.stats.avgScore} hint={`${data.stats.totalRounds} rounds cleared`} />
          </div>
          <section className="card">
            <div className="row-between"><h2>Recent activity</h2><Link to="/history">View all</Link></div>
            {data.recent.length === 0 ? (
              <div className="state"><p>No games yet. Play your first game to see your stats here.</p><Link to="/game" className="btn btn-primary">Play now</Link></div>
            ) : (
              <ul className="list">
                {data.recent.map((s) => (
                  <li key={s._id}><span><strong>{s.score} pts</strong> · level {s.levelReached} · {s.roundsCompleted}/9 rounds</span><span className="muted small">{formatDate(s.createdAt)}</span></li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
