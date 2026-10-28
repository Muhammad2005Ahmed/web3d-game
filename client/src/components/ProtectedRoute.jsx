import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="center-screen"><div className="spinner" role="status" aria-label="Loading" /></div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}
