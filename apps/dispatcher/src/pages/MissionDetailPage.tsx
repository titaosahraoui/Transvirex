import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../context/AuthContext';

interface Mission {
  id: string; clientName: string; pickupAddress: string; deliveryAddress: string;
  deadline: string | null; status: string; driverId: string | null;
}

interface Suggestion {
  driverId: string; name: string; score: number;
  features: { distanceKm: number; currentLoad: number; acceptanceRate: number; };
}

interface Driver { id: string; name: string; status: string; }

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mission, setMission]         = useState<Mission | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [drivers, setDrivers]         = useState<Driver[]>([]);
  const [aiLoading, setAiLoading]     = useState(false);
  const [assigning, setAssigning]     = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    api.get(`/missions/${id}`).then(r => setMission(r.data.data)).catch(console.error);
    api.get('/drivers?status=available').then(r => setDrivers(r.data.data)).catch(console.error);
  }, [id]);

  async function fetchAISuggestions() {
    setAiLoading(true); setSuggestions([]);
    try {
      const r = await api.post('/ai/suggest-assignment', { missionId: id });
      setSuggestions(r.data.data.suggestions);
    } catch { setError('AI service unavailable'); }
    finally { setAiLoading(false); }
  }

  async function assignDriver(driverId: string) {
    setAssigning(true); setError('');
    try {
      await api.patch(`/missions/${id}/assign`, { driverId });
      setMission(prev => prev ? { ...prev, status: 'assigned', driverId } : prev);
      setSuggestions([]);
    } catch { setError('Failed to assign driver'); }
    finally { setAssigning(false); }
  }

  if (!mission) return <div className="min-h-screen bg-gray-100 flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/board')} className="text-gray-400 hover:text-gray-700">← Board</button>
        <h1 className="font-bold text-xl text-gray-800">{mission.clientName}</h1>
        <span className={`ml-auto text-sm px-3 py-1 rounded-full font-medium
          ${mission.status === 'pending' ? 'bg-gray-100 text-gray-600' :
            mission.status === 'assigned' ? 'bg-yellow-100 text-yellow-700' :
            mission.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
            mission.status === 'completed' ? 'bg-green-100 text-green-700' :
            'bg-red-100 text-red-700'}`}>
          {mission.status.replace('_', ' ')}
        </span>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-4">
        {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2">{error}</div>}

        {/* Mission info */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
          <div><p className="text-xs text-gray-400 mb-1">PICKUP</p><p className="font-medium">📍 {mission.pickupAddress}</p></div>
          <div className="border-t" />
          <div><p className="text-xs text-gray-400 mb-1">DELIVERY</p><p className="font-medium">🏁 {mission.deliveryAddress}</p></div>
          {mission.deadline && (
            <><div className="border-t" />
            <p className="text-orange-500 text-sm">⏰ {new Date(mission.deadline).toLocaleString()}</p></>
          )}
        </div>

        {/* Assignment panel — only for pending missions */}
        {mission.status === 'pending' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">🤖 AI Driver Suggestions</h2>
              <button onClick={fetchAISuggestions} disabled={aiLoading}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded-lg transition-colors">
                {aiLoading ? 'Analyzing…' : 'Get Suggestions'}
              </button>
            </div>

            {suggestions.length > 0 && (
              <div className="space-y-2 mb-4">
                {suggestions.map((s, i) => (
                  <div key={s.driverId} className="flex items-center justify-between bg-purple-50 rounded-xl p-3">
                    <div>
                      <p className="font-medium text-gray-800">
                        {i === 0 && <span className="text-yellow-500 mr-1">★</span>}
                        {s.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {s.features.distanceKm.toFixed(1)} km · load {s.features.currentLoad} · {s.features.acceptanceRate.toFixed(0)}% acceptance
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-purple-700">{(s.score * 100).toFixed(0)}%</span>
                      <button onClick={() => assignDriver(s.driverId)} disabled={assigning}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
                        Assign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h3 className="text-sm font-medium text-gray-600 mb-2">All available drivers</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {drivers.map(d => (
                <div key={d.id} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">{d.name}</span>
                  <button onClick={() => assignDriver(d.id)} disabled={assigning}
                    className="text-xs bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-600 px-3 py-1 rounded-lg transition-colors">
                    Assign
                  </button>
                </div>
              ))}
              {drivers.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No available drivers</p>}
            </div>
          </div>
        )}

        {/* Driver assigned info */}
        {mission.driverId && mission.status !== 'pending' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-2">Assigned Driver</h2>
            <p className="text-gray-600 text-sm">Driver ID: {mission.driverId}</p>
          </div>
        )}
      </div>
    </div>
  );
}
