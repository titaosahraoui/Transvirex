import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function LoginPage() {
  return <div className="flex items-center justify-center min-h-screen"><h1 className="text-2xl font-bold">Management Login</h1></div>;
}

function DashboardPage() {
  return <div className="p-4"><h1 className="text-xl font-bold">Dashboard</h1></div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
