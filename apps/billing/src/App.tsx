import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function LoginPage() {
  return <div className="flex items-center justify-center min-h-screen"><h1 className="text-2xl font-bold">Billing Login</h1></div>;
}

function InvoicesPage() {
  return <div className="p-4"><h1 className="text-xl font-bold">Invoices</h1></div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/" element={<Navigate to="/invoices" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
