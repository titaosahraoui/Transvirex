import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Loading…</div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (user.role !== 'dispatcher') return <div className="p-8 text-red-600">Access denied — dispatcher account required</div>;
  return <>{children}</>;
}
