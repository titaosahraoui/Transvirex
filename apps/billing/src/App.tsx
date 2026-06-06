import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import StatsPage from './pages/StatsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
          <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetailPage /></ProtectedRoute>} />
          <Route path="/stats" element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/invoices" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
