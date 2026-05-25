import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';

interface Mission {
  id: string;
  clientName: string;
  pickupAddress: string;
  deliveryAddress: string;
  deadline: string | null;
  status: string;
  driverId: string | null;
  createdAt: string;
}

const COLUMNS = [
  { key: 'pending',     label: 'Pending',     color: 'border-gray-300 bg-gray-50' },
  { key: 'assigned',    label: 'Assigned',     color: 'border-yellow-300 bg-yellow-50' },
  { key: 'in_progress', label: 'In Progress',  color: 'border-blue-300 bg-blue-50' },
  { key: 'completed',   label: 'Completed',    color: 'border-green-300 bg-green-50' },
  { key: 'failed',      label: 'Failed',       color: 'border-red-300 bg-red-50' },
];

const BADGE: Record<string, string> = {
  pending:     'bg-gray-100 text-gray-600',
  assigned:    'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed:   'bg-green-100 text-green-700',
  failed:      'bg-red-100 text-red-700',
};

export default function BoardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get('/missions');
      setMissions(r.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  // Poll every 10 s for live updates
  useEffect(() => {
    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [load]);

  const byStatus = (status: string) => missions.filter(m => m.status === status);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl text-gray-800">Mission Board</h1>
          <p className="text-sm text-gray-500">{user?.name}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/missions/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + New Mission
          </button>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-700">Sign out</button>
        </div>
      </header>

      {/* Kanban board */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">Loading…</div>
      ) : (
        <div className="flex gap-4 p-6 overflow-x-auto">
          {COLUMNS.map(col => (
            <div key={col.key} className={`shrink-0 w-72 rounded-xl border-2 ${col.color} p-3`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-700">{col.label}</h2>
                <span className="text-xs bg-white rounded-full px-2 py-0.5 text-gray-500 border">
                  {byStatus(col.key).length}
                </span>
              </div>

              <div className="space-y-2">
                {byStatus(col.key).map(m => (
                  <button key={m.id} onClick={() => navigate(`/missions/${m.id}`)}
                    className="w-full bg-white rounded-xl p-3 text-left shadow-sm hover:shadow-md transition-shadow">
                    <p className="font-medium text-gray-800 text-sm">{m.clientName}</p>
                    <p className="text-xs text-gray-500 mt-1 truncate">📍 {m.pickupAddress}</p>
                    <p className="text-xs text-gray-500 truncate">🏁 {m.deliveryAddress}</p>
                    {m.deadline && (
                      <p className="text-xs text-orange-500 mt-1">
                        ⏰ {new Date(m.deadline).toLocaleDateString()}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${BADGE[m.status]}`}>
                        {col.label}
                      </span>
                    </div>
                  </button>
                ))}

                {byStatus(col.key).length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-4">Empty</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
