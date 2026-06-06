import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';

interface Mission {
  id: string; clientName: string; pickupAddress: string; deliveryAddress: string;
  deadline: string | null; status: string; driverId: string | null;
}
interface Suggestion {
  driverId: string; name: string; score: number;
  features: { distanceKm: number; currentLoad: number; acceptanceRate: number };
}
interface Driver { id: string; name: string; status: string; }

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente', assigned: 'Assignée', in_progress: 'En route',
  completed: 'Livrée', failed: 'Échec',
};
const STATUS_PILL: Record<string, string> = {
  pending: '', assigned: 'warn', in_progress: 'warn', completed: 'good', failed: 'bad',
};

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const socketRef = useSocket(token);
  const [mission, setMission]         = useState<Mission | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [drivers, setDrivers]         = useState<Driver[]>([]);
  const [aiLoading, setAiLoading]     = useState(false);
  const [assigning, setAssigning]     = useState(false);
  const [error, setError]             = useState('');
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number; age: number } | null>(null);

  useEffect(() => {
    api.get(`/missions/${id}`).then(r => setMission(r.data.data)).catch(console.error);
    api.get('/drivers?status=available').then(r => setDrivers(r.data.data)).catch(console.error);
  }, [id]);

  // Real-time: receive GPS pings from the driver while in_progress
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const handler = (data: { missionId: string; lat: number; lng: number }) => {
      if (data.missionId !== id) return;
      setLastLocation({ lat: data.lat, lng: data.lng, age: 0 });
    };
    socket.on('driver:location', handler);
    return () => { socket.off('driver:location', handler); };
  }, [socketRef.current, id]);

  // Tick the location age counter every second
  useEffect(() => {
    if (!lastLocation) return;
    const t = setInterval(() => {
      setLastLocation(prev => prev ? { ...prev, age: prev.age + 1 } : prev);
    }, 1000);
    return () => clearInterval(t);
  }, [lastLocation?.lat, lastLocation?.lng]);

  async function fetchAISuggestions() {
    setAiLoading(true); setSuggestions([]);
    try {
      const r = await api.post('/ai/suggest-assignment', { missionId: id });
      setSuggestions(r.data.data.suggestions);
    } catch { setError('Service IA indisponible'); }
    finally { setAiLoading(false); }
  }

  async function assignDriver(driverId: string) {
    setAssigning(true); setError('');
    try {
      await api.patch(`/missions/${id}/assign`, { driverId });
      setMission(prev => prev ? { ...prev, status: 'assigned', driverId } : prev);
      setSuggestions([]);
    } catch { setError('Impossible d\'assigner le chauffeur'); }
    finally { setAssigning(false); }
  }

  if (!mission) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="mono muted">Chargement…</span>
    </div>
  );

  const statusLabel = STATUS_LABEL[mission.status] ?? mission.status;

  return (
    <div className="wf-shell">
      {/* Sidebar */}
      <aside className="wf-side">
        <div className="side-logo">transvirex</div>
        <div className="side-group">OPÉRATIONS</div>
        <div className="side-nav on" onClick={() => navigate('/board')}>
          <span className="ic">📋</span> Missions
        </div>
        <div className="side-nav" onClick={() => navigate('/missions/new')}>
          <span className="ic">＋</span> Nouvelle mission
        </div>
      </aside>

      <div className="wf-shell-main">
        <div className="wf-appbar">
          <span
            className="mono muted"
            style={{ cursor: 'pointer', fontSize: 11 }}
            onClick={() => navigate('/board')}
          >
            ← Missions
          </span>
          <span className="bar-crumbs">/ {mission.clientName}</span>
          <div className="bar-actions">
            <span className={`wf-pill ${STATUS_PILL[mission.status]}`}>{statusLabel}</span>
            {mission.status === 'in_progress' && (
              <button className="wf-btn warn sm" onClick={() => api.patch(`/missions/${id}/status`, { status: 'failed' }).then(() => setMission(p => p ? { ...p, status: 'failed' } : p))}>
                ⚠ Incident
              </button>
            )}
          </div>
        </div>

        <div className="wf-shell-content" style={{ maxWidth: 900 }}>
          {error && <div className="wf-error" style={{ marginBottom: 14 }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 14 }}>
            {/* Left: info + timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div className="script" style={{ fontSize: 28, lineHeight: 1 }}>{mission.clientName}</div>
                <div className="mono muted" style={{ fontSize: 10.5, marginTop: 2 }}>
                  Mission {mission.id.slice(0, 8)} · {statusLabel}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="wf-box solid">
                  <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>Enlèvement</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>📍 {mission.pickupAddress}</div>
                </div>
                <div className="wf-box solid">
                  <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>Livraison</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>🏁 {mission.deliveryAddress}</div>
                </div>
              </div>

              {mission.deadline && (
                <div className="wf-box tint">
                  <span className="mono" style={{ fontSize: 11 }}>
                    ⏱ Délai : {new Date(mission.deadline).toLocaleString('fr-FR')}
                  </span>
                </div>
              )}

              {/* Timeline */}
              <div>
                <div className="mono muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                  Chronologie
                </div>
                <div style={{ borderLeft: '2px dashed var(--ink)', paddingLeft: 12, marginLeft: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { label: 'Créée', done: true },
                    { label: 'Assignée à un chauffeur', done: ['assigned','in_progress','completed'].includes(mission.status) },
                    { label: 'Prise en charge', done: ['in_progress','completed'].includes(mission.status) },
                    { label: 'En route', done: ['in_progress','completed'].includes(mission.status) },
                    { label: 'Livrée / POD validé', done: mission.status === 'completed' },
                  ].map((step, i) => (
                    <div key={i} className="wf-row" style={{ padding: '6px 10px', gap: 8 }}>
                      <div className="wf-row-lead" style={{ width: 28, height: 28, fontSize: 13 }}>
                        {step.done ? '✓' : '○'}
                      </div>
                      <span style={{ fontSize: 13, color: step.done ? 'var(--ink)' : 'var(--ink-3)' }}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: assignment */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {mission.status === 'pending' && (
                <div className="wf-box solid">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>🤖 Suggestions IA</span>
                    <button className="wf-btn sm" disabled={aiLoading} onClick={fetchAISuggestions}>
                      {aiLoading ? 'Analyse…' : 'Analyser'}
                    </button>
                  </div>

                  {suggestions.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      {suggestions.map((s, i) => (
                        <div key={s.driverId} className="wf-row solid" style={{ marginTop: i ? 6 : 0, gap: 8 }}>
                          <div className="wf-row-lead" style={{ background: i === 0 ? 'var(--hi)' : '#fff5d6' }}>
                            {i === 0 ? '★' : s.name[0]}
                          </div>
                          <div className="wf-row-main">
                            <b>{s.name}</b>
                            <small>{s.features.distanceKm.toFixed(1)} km · charge {s.features.currentLoad}</small>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            <span className="mono" style={{ fontSize: 11, fontWeight: 700 }}>
                              {(s.score * 100).toFixed(0)}%
                            </span>
                            <button className="wf-btn sm good" disabled={assigning} onClick={() => assignDriver(s.driverId)}>
                              Assigner
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mono muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                    Tous les chauffeurs disponibles
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                    {drivers.map(d => (
                      <div key={d.id} className="wf-row clickable" style={{ gap: 8 }}>
                        <div className="wf-row-lead">{d.name[0]}</div>
                        <div className="wf-row-main"><b>{d.name}</b></div>
                        <button className="wf-btn sm" disabled={assigning} onClick={() => assignDriver(d.id)}>
                          Assigner
                        </button>
                      </div>
                    ))}
                    {drivers.length === 0 && (
                      <div className="mono muted" style={{ textAlign: 'center', fontSize: 11, padding: '12px 0' }}>
                        Aucun chauffeur disponible
                      </div>
                    )}
                  </div>
                </div>
              )}

              {mission.driverId && mission.status !== 'pending' && (
                <div className="wf-box solid">
                  <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>Chauffeur assigné</div>
                  <div className="wf-row solid">
                    <div className="wf-row-lead">🚐</div>
                    <div className="wf-row-main">
                      <b>Chauffeur #{mission.driverId.slice(0, 6)}</b>
                      <small>{statusLabel}</small>
                    </div>
                    <span className={`wf-pill ${STATUS_PILL[mission.status]}`}>{statusLabel}</span>
                  </div>
                  {mission.status === 'in_progress' && lastLocation && (
                    <div className="mono" style={{ fontSize: 10.5, marginTop: 8, color: 'var(--accent)' }}>
                      📍 En route — position reçue il y a {lastLocation.age}s
                      <span style={{ color: 'var(--ink-3)', marginLeft: 6 }}>
                        ({lastLocation.lat.toFixed(4)}, {lastLocation.lng.toFixed(4)})
                      </span>
                    </div>
                  )}
                  {mission.status === 'in_progress' && !lastLocation && (
                    <div className="mono muted" style={{ fontSize: 10, marginTop: 6 }}>
                      En attente de la position GPS…
                    </div>
                  )}
                </div>
              )}

              {mission.status === 'completed' && (
                <div className="wf-box" style={{ background: '#e3f4dc', borderStyle: 'solid', borderColor: 'var(--good)' }}>
                  <div style={{ fontFamily: 'var(--font-script)', fontSize: 22, fontWeight: 700 }}>✓ Mission livrée</div>
                </div>
              )}

              {mission.status === 'failed' && (
                <div className="wf-box" style={{ background: '#ffd9d9', borderStyle: 'solid', borderColor: 'var(--bad)' }}>
                  <div style={{ fontFamily: 'var(--font-script)', fontSize: 22, fontWeight: 700 }}>⚠ Mission échouée</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
