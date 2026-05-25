import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../context/AuthContext';

interface Mission {
  id: string;
  clientName: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  deadline: string | null;
  status: string;
  driverId: string | null;
}

const NEXT_ACTIONS: Record<string, { label: string; status: string; color: string }[]> = {
  assigned: [
    { label: '✅ Accept Mission',  status: 'in_progress', color: 'bg-green-600 hover:bg-green-700' },
    { label: '❌ Refuse Mission',  status: 'pending',     color: 'bg-red-600   hover:bg-red-700'   },
  ],
  in_progress: [
    { label: '✅ Mark Delivered',  status: 'completed', color: 'bg-green-600 hover:bg-green-700' },
    { label: '⚠️ Report Incident', status: 'failed',    color: 'bg-red-600   hover:bg-red-700'   },
  ],
};

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    api.get(`/missions/${id}`)
      .then(r => setMission(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function updateStatus(status: string) {
    if (!mission) return;
    setUpdating(true);
    try {
      await api.patch(`/missions/${mission.id}/status`, { status });
      if (status === 'pending') {
        // refused — go back to list
        navigate('/missions');
      } else {
        setMission(prev => prev ? { ...prev, status } : prev);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update mission status');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      Loading…
    </div>
  );

  if (!mission) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      Mission not found
    </div>
  );

  const actions = NEXT_ACTIONS[mission.status] ?? [];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 px-4 py-4 flex items-center gap-3 sticky top-0">
        <button onClick={() => navigate('/missions')} className="text-gray-400 hover:text-white text-xl">
          ←
        </button>
        <h1 className="font-bold text-lg">{mission.clientName}</h1>
      </header>

      <div className="px-4 py-6 space-y-4">
        {/* Status badge */}
        <div className="flex">
          <span className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-sm">
            {mission.status.replace('_', ' ')}
          </span>
        </div>

        {/* Route card */}
        <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
          <div>
            <p className="text-xs text-gray-400 mb-1">PICKUP</p>
            <p className="font-medium">📍 {mission.pickupAddress}</p>
            {mission.pickupLat && (
              <p className="text-xs text-gray-500">
                {parseFloat(String(mission.pickupLat)).toFixed(4)}, {parseFloat(String(mission.pickupLng)).toFixed(4)}
              </p>
            )}
          </div>
          <div className="border-t border-gray-700" />
          <div>
            <p className="text-xs text-gray-400 mb-1">DELIVERY</p>
            <p className="font-medium">🏁 {mission.deliveryAddress}</p>
          </div>
          {mission.deadline && (
            <>
              <div className="border-t border-gray-700" />
              <div>
                <p className="text-xs text-gray-400 mb-1">DEADLINE</p>
                <p className="text-orange-400">⏰ {new Date(mission.deadline).toLocaleString()}</p>
              </div>
            </>
          )}
        </div>

        {/* Open in maps */}
        {mission.pickupLat && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${mission.deliveryLat},${mission.deliveryLng}`}
            target="_blank"
            rel="noreferrer"
            className="block w-full bg-gray-700 hover:bg-gray-600 text-center py-3 rounded-xl text-sm transition-colors"
          >
            🗺️ Open Route in Maps
          </a>
        )}

        {/* Action buttons */}
        {actions.length > 0 && (
          <div className="space-y-3 pt-4">
            {actions.map(action => (
              <button
                key={action.status}
                disabled={updating}
                onClick={() => updateStatus(action.status)}
                className={`w-full py-4 rounded-xl font-semibold text-white transition-colors disabled:opacity-50 ${action.color}`}
              >
                {updating ? 'Updating…' : action.label}
              </button>
            ))}
          </div>
        )}

        {(mission.status === 'completed' || mission.status === 'failed') && (
          <div className="bg-gray-800 rounded-2xl p-4 text-center text-gray-400">
            Mission {mission.status}
          </div>
        )}
      </div>
    </div>
  );
}
