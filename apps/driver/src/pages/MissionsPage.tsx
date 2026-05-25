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

const STATUS_COLORS: Record<string, string> = {
  assigned:    'bg-yellow-500/20 text-yellow-300',
  in_progress: 'bg-blue-500/20 text-blue-300',
  completed:   'bg-green-500/20 text-green-300',
  failed:      'bg-red-500/20 text-red-300',
};

const STATUS_LABEL: Record<string, string> = {
  assigned:    'Assigned',
  in_progress: 'In Progress',
  completed:   'Completed',
  failed:      'Failed',
};

export default function MissionsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<string>('all');

  // Fetch driver profile → then fetch driver's missions
  const load = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Get the driver record linked to this user
      const driverRes = await api.get(`/drivers/by-user/${user.id}`);
      const driverId: string = driverRes.data.data.id;

      const url = filter === 'all'
        ? `/missions?driverId=${driverId}`
        : `/missions?driverId=${driverId}&status=${filter}`;

      const r = await api.get(url);
      setMissions(r.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, filter]);

  useEffect(() => { load(); }, [load]);

  const filters = ['all', 'assigned', 'in_progress', 'completed', 'failed'];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <p className="text-xs text-gray-400">Welcome</p>
          <h1 className="font-bold">{user?.name}</h1>
        </div>
        <button onClick={logout} className="text-xs text-gray-400 hover:text-white">
          Sign out
        </button>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors
              ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            {f === 'all' ? 'All' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {/* Mission list */}
      <div className="px-4 pb-24 space-y-3">
        {loading && (
          <div className="text-center text-gray-400 py-12">Loading missions…</div>
        )}
        {!loading && missions.length === 0 && (
          <div className="text-center text-gray-400 py-12">No missions found</div>
        )}
        {missions.map(m => (
          <button
            key={m.id}
            onClick={() => navigate(`/missions/${m.id}`)}
            className="w-full bg-gray-800 rounded-2xl p-4 text-left hover:bg-gray-750 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="font-semibold">{m.clientName}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[m.status] ?? 'bg-gray-600 text-gray-300'}`}>
                {STATUS_LABEL[m.status] ?? m.status}
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-1">📍 {m.pickupAddress}</p>
            <p className="text-sm text-gray-400">🏁 {m.deliveryAddress}</p>
            {m.deadline && (
              <p className="text-xs text-orange-400 mt-2">
                ⏰ {new Date(m.deadline).toLocaleString()}
              </p>
            )}
          </button>
        ))}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 flex">
        <button onClick={() => navigate('/missions')}
          className="flex-1 py-4 text-blue-400 text-xs flex flex-col items-center gap-1">
          <span className="text-xl">📋</span> Missions
        </button>
        <button onClick={() => navigate('/chat')}
          className="flex-1 py-4 text-gray-400 text-xs flex flex-col items-center gap-1">
          <span className="text-xl">💬</span> Chat
        </button>
      </nav>
    </div>
  );
}
