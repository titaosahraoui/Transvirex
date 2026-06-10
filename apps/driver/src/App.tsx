import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MissionsPage from './pages/MissionsPage';
import MissionDetailPage from './pages/MissionDetailPage';
import ChatPage from './pages/ChatPage';

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/missions" element={
              <ProtectedRoute><MissionsPage /></ProtectedRoute>
            } />
            <Route path="/missions/:id" element={
              <ProtectedRoute><MissionDetailPage /></ProtectedRoute>
            } />
            <Route path="/chat" element={
              <ProtectedRoute><ChatPage /></ProtectedRoute>
            } />

            <Route path="/" element={<Navigate to="/missions" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
