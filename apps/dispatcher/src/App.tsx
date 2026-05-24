import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function LoginPage() {
  return <div className="flex items-center justify-center min-h-screen"><h1 className="text-2xl font-bold">Dispatcher Login</h1></div>;
}

function MissionBoardPage() {
  return <div className="p-4"><h1 className="text-xl font-bold">Mission Board</h1></div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/board" element={<MissionBoardPage />} />
        <Route path="/" element={<Navigate to="/board" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
