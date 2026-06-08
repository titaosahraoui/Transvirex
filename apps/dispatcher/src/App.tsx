import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BoardPage from './pages/BoardPage';
import NewMissionPage from './pages/NewMissionPage';
import MissionDetailPage from './pages/MissionDetailPage';
import DriversPage from './pages/DriversPage';
import PlanningPage from './pages/PlanningPage';
import AlertsPage from './pages/AlertsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/board" element={<ProtectedRoute><BoardPage /></ProtectedRoute>} />
          <Route path="/missions/new" element={<ProtectedRoute><NewMissionPage /></ProtectedRoute>} />
          <Route path="/missions/:id" element={<ProtectedRoute><MissionDetailPage /></ProtectedRoute>} />
          <Route path="/drivers" element={<ProtectedRoute><DriversPage /></ProtectedRoute>} />
          <Route path="/planning" element={<ProtectedRoute><PlanningPage /></ProtectedRoute>} />
          <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/board" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
