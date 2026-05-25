import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading…</div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (user.role !== 'driver') return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-red-400">Access denied — driver account required</div>;
  return <>{children}</>;
}
