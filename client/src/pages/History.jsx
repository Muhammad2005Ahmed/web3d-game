import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Loading, ErrorBox } from '../components/Status.jsx';
import { formatDate } from '../utils/validators.js';

export default function History() {
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setError(''); setSessions(null);
    api('/games?limit=50').then((d) => setSessions(d.sessions)).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  return (
    <>
      <h1>Game history</h1>
      {error && <ErrorBox message={error} onRetry={load} />}
      {!error && !sessions && <Loading />}
      {sessions && sessions.length === 0 && (
        <div className="card state"><p>Nothing here yet.</p><Link to="/game" className="btn btn-primary">Play your first game</Link></div>
      )}
      {sessions && sessions.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Score</th><th>Level</th><th>Rounds</th><th>Hits</th><th>Bombs</th><th>Time</th></tr></thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s._id}>
                  <td>{formatDate(s.createdAt)}</td><td><strong>{s.score}</strong></td><td>{s.levelReached}</td>
                  <td>{s.roundsCompleted}/9</td><td>{s.hits}</td><td>{s.bombHits}</td><td>{s.durationSec}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
