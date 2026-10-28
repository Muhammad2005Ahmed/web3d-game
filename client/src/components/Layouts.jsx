import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function PublicLayout() {
  const { user } = useAuth();
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">◆ Orb Rush</Link>
        <nav aria-label="Main">
          <NavLink to="/" end>Home</NavLink>
          {user ? (
            <NavLink to="/dashboard" className="btn btn-primary btn-sm">Dashboard</NavLink>
          ) : (
            <>
              <NavLink to="/login">Login</NavLink>
              <NavLink to="/signup" className="btn btn-primary btn-sm">Sign Up</NavLink>
            </>
          )}
        </nav>
      </header>
      <main><Outlet /></main>
    </>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const onLogout = () => { logout(); navigate('/', { replace: true }); };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/dashboard" className="brand">◆ Orb Rush</Link>
        <nav aria-label="App">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/game">Play Game</NavLink>
          <NavLink to="/history">Game History</NavLink>
          <button type="button" className="linklike" onClick={onLogout}>Logout</button>
        </nav>
        <p className="muted sidebar-user">Signed in as <strong>{user.username}</strong></p>
      </aside>
      <main className="app-main"><Outlet /></main>
    </div>
  );
}
