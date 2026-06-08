import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { dispatchNav } from '../lib/dispatchNav';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';

interface Mission {
  id: string; clientName: string;
  pickupAddress: string; pickupLat: number; pickupLng: number;
  deliveryAddress: string; deliveryLat: number; deliveryLng: number;
  deadline: string | null; status: string; driverId: string | null;
  createdBy: string; createdAt: string;
  price: string; missionType: string; weightKg: string;
  notes: string | null; priority: string;
}
interface Suggestion {
  driverId: string; name: string; score: number;
  features: { distanceKm: number; currentLoad: number; acceptanceRate: number };
}
interface Driver { id: string; name: string; status: string; }
interface DriverDetail { id: string; name: string; status: string; vehicleType: string; }
interface DeliveryEvent {
  _id: string; status: string; timestamp: string;
  location: { lat: number; lng: number };
  notes?: string; podPhotoUrl?: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente', assigned: 'Assignée', in_progress: 'En route',
  completed: 'Livrée', failed: 'Échec', cancelled: 'Annulée',
};

const PRIORITY_CONFIG: Record<string, { label: string; cls: string }> = {
  low:    { label: 'Faible',  cls: '' },
  medium: { label: 'Normale', cls: 'warn' },
  high:   { label: 'Haute',   cls: 'warn' },
  urgent: { label: 'Urgente', cls: 'bad' },
};
const MISSION_TYPE_LABEL: Record<string, string> = {
  standard: 'Standard', express: 'Express', lourd: 'Lourd', fragile: 'Fragile',
};
const STATUS_PILL: Record<string, string> = {
  pending: '', assigned: 'warn', in_progress: 'warn', completed: 'good', failed: 'bad', cancelled: 'bad',
};

const EVENT_ICON: Record<string, string> = {
  completed: '✓', failed: '⚠', in_progress: '●', cancelled: '✕', rejected: '✕',
};

const pickupIcon  = L.divIcon({ className: '', html: '📍', iconSize: [28, 28], iconAnchor: [14, 28] });
const deliveryIcon = L.divIcon({ className: '', html: '🏁', iconSize: [28, 28], iconAnchor: [14, 28] });
const driverIcon  = L.divIcon({ className: '', html: '🚐', iconSize: [28, 28], iconAnchor: [14, 28] });

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const socketRef = useSocket(token);

  const [mission, setMission]           = useState<Mission | null>(null);
  const [suggestions, setSuggestions]   = useState<Suggestion[]>([]);
  const [drivers, setDrivers]           = useState<Driver[]>([]);
  const [driverDetail, setDriverDetail] = useState<DriverDetail | null>(null);
  const [events, setEvents]             = useState<DeliveryEvent[]>([]);
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number; age: number } | null>(null);
  const [locationHistory, setLocationHistory] = useState<{ lat: number; lng: number }[]>([]);

  // Edit state
  const [editing, setEditing]     = useState(false);
  const [editForm, setEditForm]   = useState<Partial<Mission>>({});
  const [saving, setSaving]       = useState(false);

  // Reassign state
  const [showReassign, setShowReassign] = useState(false);
  const [reassigning, setReassigning]   = useState(false);
  const [aiLoading, setAiLoading]       = useState(false);
  const [assigning, setAssigning]       = useState(false);
  const [cancelling, setCancelling]     = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    api.get(`/missions/${id}`).then(r => {
      const m = r.data.data;
      setMission(m);
      setEditForm(m);
      if (['assigned', 'in_progress', 'completed'].includes(m.status)) {
        api.get(`/missions/${id}/location-history`)
          .then(lhr => setLocationHistory(lhr.data.data ?? []))
          .catch(() => {});
      }
    }).catch(console.error);
    api.get('/drivers?status=available').then(r => setDrivers(r.data.data ?? [])).catch(console.error);
    api.get(`/missions/${id}/events`).then(r => setEvents(r.data.data ?? [])).catch(console.error);
  }, [id]);

  // Fetch real driver name whenever driverId changes
  useEffect(() => {
    if (!mission?.driverId) { setDriverDetail(null); return; }
    api.get(`/drivers/${mission.driverId}`)
      .then(r => setDriverDetail(r.data.data))
      .catch(() => setDriverDetail(null));
  }, [mission?.driverId]);

  // Real-time GPS pings from driver
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const handler = (data: { missionId: string; lat: number; lng: number }) => {
      if (data.missionId !== id) return;
      setLastLocation({ lat: data.lat, lng: data.lng, age: 0 });
      setLocationHistory(prev => [...prev, { lat: data.lat, lng: data.lng }]);
    };
    socket.on('driver:location', handler);
    return () => { socket.off('driver:location', handler); };
  }, [socketRef.current, id]);

  // Age counter for GPS freshness
  useEffect(() => {
    if (!lastLocation) return;
    const t = setInterval(() => setLastLocation(prev => prev ? { ...prev, age: prev.age + 1 } : prev), 1000);
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

  async function cancelMission() {
    setCancelling(true); setError('');
    try {
      await api.patch(`/missions/${id}/cancel`);
      setMission(prev => prev ? { ...prev, status: 'cancelled', driverId: null } : prev);
      setSuggestions([]);
    } catch { setError("Impossible d'annuler la mission"); }
    finally { setCancelling(false); }
  }

  async function assignDriver(driverId: string) {
    setAssigning(true); setError('');
    try {
      await api.patch(`/missions/${id}/assign`, { driverId });
      setMission(prev => prev ? { ...prev, status: 'assigned', driverId } : prev);
      setSuggestions([]);
    } catch { setError("Impossible d'assigner le chauffeur"); }
    finally { setAssigning(false); }
  }

  async function reassignDriver(driverId: string) {
    setReassigning(true); setError('');
    try {
      await api.patch(`/missions/${id}/reassign`, { driverId });
      setMission(prev => prev ? { ...prev, driverId } : prev);
      setShowReassign(false);
    } catch { setError("Impossible de réassigner le chauffeur"); }
    finally { setReassigning(false); }
  }

  async function saveEdit() {
    setSaving(true); setError('');
    try {
      const r = await api.patch(`/missions/${id}`, editForm);
      setMission(r.data.data);
      setEditForm(r.data.data);
      setEditing(false);
    } catch { setError('Impossible de modifier la mission'); }
    finally { setSaving(false); }
  }

  function field(key: keyof Mission, value: string) {
    setEditForm(prev => ({ ...prev, [key]: value }));
  }

  if (!mission) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="mono muted">Chargement…</span>
    </div>
  );

  const statusLabel = STATUS_LABEL[mission.status] ?? mission.status;
  const canEdit     = ['pending', 'assigned'].includes(mission.status);
  const canCancel   = ['pending', 'assigned'].includes(mission.status);

  return (
    <div className="wf-shell">
      {/* Sidebar */}
      <aside className="wf-side">
        <div className="side-logo">transvirex</div>
        <div className="side-role">Dispatcher</div>
        {dispatchNav.map((item, i) => {
          if (typeof item === 'string') return <div key={i} className="side-group">{item}</div>;
          return (
            <div
              key={item.key}
              className={`side-nav ${item.key === 'miss' ? 'on' : ''}`}
              onClick={() => item.path && navigate(item.path)}
            >
              <span className="ic">{item.icon}</span>
              {item.label}
            </div>
          );
        })}
      </aside>

      <div className="wf-shell-main">
        {/* AppBar */}
        <div className="wf-appbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="mono muted" style={{ cursor: 'pointer', fontSize: 11 }} onClick={() => navigate('/board')}>
              ← Missions
            </span>
            <span className="bar-crumbs">/ {mission.clientName}</span>
          </div>
          <div className="bar-actions">
            <span className={`wf-pill ${STATUS_PILL[mission.status]}`}>{statusLabel}</span>
            {canEdit && !editing && (
              <button className="wf-btn sm" onClick={() => setEditing(true)}>✏ Modifier</button>
            )}
            {editing && (
              <>
                <button className="wf-btn sm good" disabled={saving} onClick={saveEdit}>
                  {saving ? 'Enregistrement…' : '✓ Enregistrer'}
                </button>
                <button className="wf-btn sm" onClick={() => { setEditing(false); setEditForm(mission); setError(''); }}>
                  Annuler
                </button>
              </>
            )}
            {mission.status === 'in_progress' && (
              <button
                className="wf-btn warn sm"
                onClick={() => api.patch(`/missions/${id}/status`, { status: 'failed' })
                  .then(() => setMission(p => p ? { ...p, status: 'failed' } : p))}
              >
                ⚠ Incident
              </button>
            )}
            {canCancel && (
              <button className="wf-btn bad sm" disabled={cancelling} onClick={cancelMission}>
                ✕ Annuler
              </button>
            )}
          </div>
        </div>

        <div className="wf-shell-content" style={{ maxWidth: 960 }}>
          {error && (
            <div className="wf-error" style={{ marginBottom: 14 }}>{error}</div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 14 }}>
            {/* ── Left panel ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Title */}
              {!editing ? (
                <div>
                  <div className="script" style={{ fontSize: 28, lineHeight: 1 }}>{mission.clientName}</div>
                  <div className="mono muted" style={{ fontSize: 10.5, marginTop: 2 }}>
                    Mission {mission.id.slice(0, 8)} · créée le {new Date(mission.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mono muted" style={{ fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Client</div>
                  <input
                    className="wf-inp"
                    value={editForm.clientName ?? ''}
                    onChange={e => field('clientName', e.target.value)}
                    placeholder="Nom du client"
                    style={{ width: '100%', fontSize: 18, fontFamily: 'var(--font-script)' }}
                  />
                </div>
              )}

              {/* Addresses */}
              {!editing ? (
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
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <div className="mono muted" style={{ fontSize: 10, marginBottom: 3 }}>📍 Adresse d'enlèvement</div>
                    <input className="wf-inp" style={{ width: '100%' }}
                      value={editForm.pickupAddress ?? ''} onChange={e => field('pickupAddress', e.target.value)} />
                  </div>
                  <div>
                    <div className="mono muted" style={{ fontSize: 10, marginBottom: 3 }}>🏁 Adresse de livraison</div>
                    <input className="wf-inp" style={{ width: '100%' }}
                      value={editForm.deliveryAddress ?? ''} onChange={e => field('deliveryAddress', e.target.value)} />
                  </div>
                  {/* Coordinates (collapsed row) */}
                  <details>
                    <summary className="mono muted" style={{ fontSize: 10, cursor: 'pointer', marginBottom: 4 }}>Coordonnées GPS</summary>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginTop: 4 }}>
                      {([
                        ['pickupLat', 'Enl. Lat'],
                        ['pickupLng', 'Enl. Lng'],
                        ['deliveryLat', 'Liv. Lat'],
                        ['deliveryLng', 'Liv. Lng'],
                      ] as const).map(([k, label]) => (
                        <div key={k}>
                          <div className="mono muted" style={{ fontSize: 9, marginBottom: 2 }}>{label}</div>
                          <input className="wf-inp" style={{ width: '100%', fontSize: 11 }}
                            type="number" step="any"
                            value={editForm[k] ?? 0}
                            onChange={e => setEditForm(prev => ({ ...prev, [k]: parseFloat(e.target.value) || 0 }))} />
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {/* Price + Priority + Type + Weight */}
              {!editing ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="wf-box solid">
                      <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>Prix</div>
                      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-script)' }}>
                        {parseFloat(mission.price || '0').toLocaleString('fr-FR')} DZD
                      </div>
                    </div>
                    <div className="wf-box solid" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-3)' }}>Priorité</div>
                      <span className={`wf-pill ${PRIORITY_CONFIG[mission.priority]?.cls ?? ''}`} style={{ alignSelf: 'flex-start' }}>
                        {PRIORITY_CONFIG[mission.priority]?.label ?? mission.priority}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="wf-box solid">
                      <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>Type</div>
                      <div style={{ fontSize: 13 }}>{MISSION_TYPE_LABEL[mission.missionType] ?? mission.missionType}</div>
                    </div>
                    <div className="wf-box solid">
                      <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>Poids</div>
                      <div style={{ fontSize: 13 }}>{parseFloat(mission.weightKg || '0').toLocaleString('fr-FR')} kg</div>
                    </div>
                  </div>
                  {mission.notes && (
                    <div className="wf-box tint">
                      <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>Notes</div>
                      <div style={{ fontSize: 12 }}>{mission.notes}</div>
                    </div>
                  )}
                </>
              ) : null}

              {/* Deadline */}
              {!editing ? (
                mission.deadline && (
                  <div className="wf-box tint">
                    <span className="mono" style={{ fontSize: 11 }}>
                      ⏱ Délai : {new Date(mission.deadline).toLocaleString('fr-FR')}
                    </span>
                  </div>
                )
              ) : (
                <>
                  <div>
                    <div className="mono muted" style={{ fontSize: 10, marginBottom: 3 }}>⏱ Délai (optionnel)</div>
                    <input
                      className="wf-inp"
                      type="datetime-local"
                      style={{ width: '100%' }}
                      value={editForm.deadline ? editForm.deadline.slice(0, 16) : ''}
                      onChange={e => setEditForm(prev => ({ ...prev, deadline: e.target.value || null }))}
                    />
                  </div>
                  {/* New fields in edit mode */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div>
                      <div className="mono muted" style={{ fontSize: 10, marginBottom: 3 }}>Prix (DZD)</div>
                      <input type="number" min="0" step="0.01" className="wf-inp" style={{ width: '100%' }}
                        value={editForm.price ?? ''} onChange={e => setEditForm(prev => ({ ...prev, price: e.target.value }))} />
                    </div>
                    <div>
                      <div className="mono muted" style={{ fontSize: 10, marginBottom: 3 }}>Type</div>
                      <select className="wf-inp" style={{ width: '100%' }}
                        value={editForm.missionType ?? 'standard'} onChange={e => setEditForm(prev => ({ ...prev, missionType: e.target.value }))}>
                        {[['standard','Standard'],['express','Express'],['lourd','Lourd'],['fragile','Fragile']].map(([v,l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="mono muted" style={{ fontSize: 10, marginBottom: 3 }}>Poids (kg)</div>
                      <input type="number" min="0" step="0.1" className="wf-inp" style={{ width: '100%' }}
                        value={editForm.weightKg ?? ''} onChange={e => setEditForm(prev => ({ ...prev, weightKg: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <div className="mono muted" style={{ fontSize: 10, marginBottom: 3 }}>Priorité</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[['low','Faible',''],['medium','Normale','warn'],['high','Haute','warn'],['urgent','Urgente','bad']].map(([v, l, cls]) => (
                        <span key={v}
                          className={`wf-pill ${cls}${editForm.priority === v ? ' fill' : ''}`}
                          style={{ cursor: 'pointer', fontWeight: editForm.priority === v ? 700 : 400 }}
                          onClick={() => setEditForm(prev => ({ ...prev, priority: v }))}
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mono muted" style={{ fontSize: 10, marginBottom: 3 }}>Notes / Instructions</div>
                    <textarea className="wf-inp" rows={2} style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
                      value={editForm.notes ?? ''}
                      onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value || null }))}
                      placeholder="Colis fragile, code d'accès…" />
                  </div>
                </>
              )}

              {/* Status timeline */}
              <div>
                <div className="mono muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                  Chronologie
                </div>
                <div style={{ borderLeft: '2px dashed var(--ink)', paddingLeft: 12, marginLeft: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { label: 'Créée',                   done: true },
                    { label: 'Assignée à un chauffeur', done: ['assigned','in_progress','completed','failed'].includes(mission.status) },
                    { label: 'Prise en charge',         done: ['in_progress','completed','failed'].includes(mission.status) },
                    { label: 'En route',                done: ['in_progress','completed','failed'].includes(mission.status) },
                    { label: 'Livrée / POD validé',     done: mission.status === 'completed' },
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

            {/* ── Right panel ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* PENDING — assign panel */}
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

              {/* ASSIGNED — driver card + reassign */}
              {mission.status === 'assigned' && (
                <div className="wf-box solid">
                  <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>Chauffeur assigné</div>
                  <div className="wf-row solid" style={{ marginBottom: 10 }}>
                    <div className="wf-row-lead" style={{ background: 'var(--hi)', fontWeight: 700, fontSize: 15 }}>
                      {driverDetail?.name?.[0] ?? '🚐'}
                    </div>
                    <div className="wf-row-main">
                      <b>{driverDetail?.name ?? `#${mission.driverId?.slice(0, 6)}`}</b>
                      <small>{driverDetail?.vehicleType ?? ''}</small>
                    </div>
                    <span className="wf-pill warn">Assigné</span>
                  </div>
                  <button
                    className="wf-btn sm"
                    style={{ width: '100%' }}
                    onClick={() => { setShowReassign(r => !r); setSuggestions([]); }}
                  >
                    {showReassign ? '▲ Fermer' : '🔄 Changer de chauffeur'}
                  </button>

                  {showReassign && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 12 }}>🤖 Suggestions IA</span>
                        <button className="wf-btn sm" disabled={aiLoading} onClick={fetchAISuggestions}>
                          {aiLoading ? 'Analyse…' : 'Analyser'}
                        </button>
                      </div>
                      {suggestions.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          {suggestions.map((s, i) => (
                            <div key={s.driverId} className="wf-row solid" style={{ marginTop: i ? 5 : 0, gap: 8 }}>
                              <div className="wf-row-lead" style={{ background: i === 0 ? 'var(--hi)' : '#fff5d6' }}>
                                {i === 0 ? '★' : s.name[0]}
                              </div>
                              <div className="wf-row-main">
                                <b>{s.name}</b>
                                <small>{s.features.distanceKm.toFixed(1)} km</small>
                              </div>
                              <button className="wf-btn sm good" disabled={reassigning} onClick={() => reassignDriver(s.driverId)}>
                                Réassigner
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mono muted" style={{ fontSize: 10, textTransform: 'uppercase', marginBottom: 5 }}>Disponibles</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 160, overflowY: 'auto' }}>
                        {drivers.filter(d => d.id !== mission.driverId).map(d => (
                          <div key={d.id} className="wf-row clickable" style={{ gap: 8 }}>
                            <div className="wf-row-lead">{d.name[0]}</div>
                            <div className="wf-row-main"><b>{d.name}</b></div>
                            <button className="wf-btn sm" disabled={reassigning} onClick={() => reassignDriver(d.id)}>
                              Réassigner
                            </button>
                          </div>
                        ))}
                        {drivers.filter(d => d.id !== mission.driverId).length === 0 && (
                          <div className="mono muted" style={{ textAlign: 'center', fontSize: 11, padding: '10px 0' }}>
                            Aucun autre chauffeur disponible
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* IN_PROGRESS — driver tracking */}
              {mission.status === 'in_progress' && mission.driverId && (
                <div className="wf-box solid">
                  <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>Chauffeur en route</div>
                  <div className="wf-row solid">
                    <div className="wf-row-lead" style={{ background: 'var(--hi)', fontWeight: 700, fontSize: 15 }}>
                      {driverDetail?.name?.[0] ?? '🚐'}
                    </div>
                    <div className="wf-row-main">
                      <b>{driverDetail?.name ?? `#${mission.driverId.slice(0, 6)}`}</b>
                      <small>{driverDetail?.vehicleType ?? ''}</small>
                    </div>
                    <span className="wf-pill warn">En route</span>
                  </div>
                  {lastLocation ? (
                    <div className="mono" style={{ fontSize: 10.5, marginTop: 8, color: 'var(--accent)' }}>
                      📍 Position reçue il y a {lastLocation.age}s
                      <span style={{ color: 'var(--ink-3)', marginLeft: 6 }}>
                        ({lastLocation.lat.toFixed(4)}, {lastLocation.lng.toFixed(4)})
                      </span>
                    </div>
                  ) : (
                    <div className="mono muted" style={{ fontSize: 10, marginTop: 6 }}>En attente de la position GPS…</div>
                  )}
                </div>
              )}

              {/* Live tracking map (assigned or in_progress) */}
              {['assigned', 'in_progress'].includes(mission.status) && (
                <div style={{ height: 280, borderRadius: 8, overflow: 'hidden', border: '1.5px dashed var(--ink)' }}>
                  <MapContainer
                    center={
                      lastLocation
                        ? [lastLocation.lat, lastLocation.lng]
                        : (mission.pickupLat !== 0
                            ? [+mission.pickupLat, +mission.pickupLng]
                            : [36.7538, 3.0588])
                    }
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                    {mission.pickupLat !== 0 && (
                      <Marker position={[+mission.pickupLat, +mission.pickupLng]} icon={pickupIcon}>
                        <Popup>📍 {mission.pickupAddress}</Popup>
                      </Marker>
                    )}
                    {mission.deliveryLat !== 0 && (
                      <Marker position={[+mission.deliveryLat, +mission.deliveryLng]} icon={deliveryIcon}>
                        <Popup>🏁 {mission.deliveryAddress}</Popup>
                      </Marker>
                    )}
                    {locationHistory.length > 1 && (
                      <Polyline positions={locationHistory.map(p => [p.lat, p.lng] as [number, number])} color="#f59e0b" weight={3} />
                    )}
                    {lastLocation && (
                      <Marker position={[lastLocation.lat, lastLocation.lng]} icon={driverIcon}>
                        <Popup>🚐 {driverDetail?.name ?? 'Chauffeur'} — il y a {lastLocation.age}s</Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>
              )}

              {/* Terminal status banners */}
              {mission.status === 'completed' && (
                <div className="wf-box" style={{ background: '#e3f4dc', borderStyle: 'solid', borderColor: 'var(--good)' }}>
                  <div style={{ fontFamily: 'var(--font-script)', fontSize: 22, fontWeight: 700 }}>✓ Mission livrée</div>
                  {driverDetail && (
                    <div className="mono muted" style={{ fontSize: 11, marginTop: 6 }}>par {driverDetail.name}</div>
                  )}
                </div>
              )}
              {mission.status === 'failed' && (
                <div className="wf-box" style={{ background: '#ffd9d9', borderStyle: 'solid', borderColor: 'var(--bad)' }}>
                  <div style={{ fontFamily: 'var(--font-script)', fontSize: 22, fontWeight: 700 }}>⚠ Mission échouée</div>
                </div>
              )}
              {mission.status === 'cancelled' && (
                <div className="wf-box" style={{ background: '#ffd9d9', borderStyle: 'solid', borderColor: 'var(--bad)' }}>
                  <div style={{ fontFamily: 'var(--font-script)', fontSize: 22, fontWeight: 700 }}>✕ Mission annulée</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Delivery events timeline ── */}
          {events.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div className="mono muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                Événements de livraison
              </div>
              <div style={{ borderLeft: '2px dashed var(--ink)', paddingLeft: 12, marginLeft: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {events.map(ev => (
                  <div key={ev._id} className="wf-row" style={{ gap: 10 }}>
                    <div className="wf-row-lead" style={{ width: 28, height: 28, fontSize: 13 }}>
                      {EVENT_ICON[ev.status] ?? '●'}
                    </div>
                    <div className="wf-row-main">
                      <b>{STATUS_LABEL[ev.status] ?? ev.status}</b>
                      <small>{new Date(ev.timestamp).toLocaleString('fr-FR')}</small>
                      {ev.notes && <small style={{ color: 'var(--ink-3)' }}>{ev.notes}</small>}
                    </div>
                    {ev.location?.lat !== 0 && (
                      <span className="mono muted" style={{ fontSize: 10, flexShrink: 0 }}>
                        {ev.location.lat.toFixed(4)}, {ev.location.lng.toFixed(4)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
