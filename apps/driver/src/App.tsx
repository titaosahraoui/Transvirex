import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages will be imported here as they are built
function LoginPage() {
  return <div className="flex items-center justify-center min-h-screen"><h1 className="text-2xl font-bold">Driver Login</h1></div>;
}

function MissionsPage() {
  return <div className="p-4"><h1 className="text-xl font-bold">My Missions</h1></div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/missions" element={<MissionsPage />} />
        <Route path="/" element={<Navigate to="/missions" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
