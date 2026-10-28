import { Routes, Route, Link } from 'react-router-dom';
import { PublicLayout, AppLayout } from './components/Layouts.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import History from './pages/History.jsx';
import Game from './pages/Game.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<div className="center-screen"><h1>404</h1><p>Page not found.</p><Link to="/" className="btn btn-primary">Go home</Link></div>} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/game" element={<Game />} />
          <Route path="/history" element={<History />} />
        </Route>
      </Route>
    </Routes>
  );
}
