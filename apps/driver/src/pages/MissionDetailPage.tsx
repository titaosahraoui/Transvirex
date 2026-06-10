import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

interface Mission {
  id: string; clientName: string; pickupAddress: string;
  pickupLat: number; pickupLng: number; deliveryAddress: string;
  deliveryLat: number; deliveryLng: number;
  deadline: string | null; status: string; driverId: string | null;
  podPhotoUrl?: string;
}

function PodUpload({ missionId, onUploaded }: { missionId: string; onUploaded: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPreview(URL.createObjectURL(f));
  }

  async function handleUpload() {
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', f);
      await api.post(`/missions/${missionId}/pod`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded();
    } catch (err) {
      console.error(err);
    } finally { setUploading(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {preview && (
        <img src={preview} alt="Aperçu" style={{ width: '100%', borderRadius: 8, maxHeight: 200, objectFit: 'cover' }} />
      )}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: 'none' }} />
      <button className="wf-btn" style={{ width: '100%' }} onClick={() => fileRef.current?.click()}>
        📷 Choisir une photo
      </button>
      {preview && (
        <button className="wf-btn fill" style={{ width: '100%' }} disabled={uploading} onClick={handleUpload}>
          {uploading ? 'Envoi…' : '✓ Envoyer la photo'}
        </button>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  assigned: 'Assignée', in_progress: 'En route', completed: 'Livrée', failed: 'Échec', cancelled: 'Annulée',
};
const STATUS_PILL: Record<string, string> = {
  assigned: 'warn', in_progress: 'warn', completed: 'good', failed: 'bad', cancelled: 'bad',
};

const NEXT_ACTIONS: Record<string, { label: string; status: string; variant: string }[]> = {
  assigned: [
    { label: '✅ Accepter la mission', status: 'in_progress', variant: 'good' },
  ],
  in_progress: [
    { label: '✅ Marquer comme livrée', status: 'completed', variant: 'good' },
    { label: '⚠ Signaler un incident', status: 'failed',    variant: 'warn' },
  ],
};

const REJECT_REASONS = ['Trop chargé', 'Véhicule en panne', 'Zone inaccessible', 'Autre'];

// Emoji div-icons avoid Vite's default-marker image bundling issue
const pickupIcon = L.divIcon({ className: '', html: '📍', iconSize: [28, 28], iconAnchor: [14, 28] });
const deliveryIcon = L.divIcon({ className: '', html: '🏁', iconSize: [28, 28], iconAnchor: [14, 28] });

function FitBounds({ bounds }: { bounds: [[number, number], [number, number]] }) {
  const map = useMap();
  useEffect(() => { map.fitBounds(bounds, { padding: [30, 30] }); }, []);
  return null;
}

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { socket } = useNotification();
  const watchIdRef = useRef<number | null>(null);
  const [mission, setMission]     = useState<Mission | null>(null);
  const [loading, setLoading]     = useState(true);
  const [updating, setUpdating]   = useState(false);
  const [gpsActive, setGpsActive] = useState(false);
  const [showReject, setShowReject]   = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting]     = useState(false);

  useEffect(() => {
    api.get(`/missions/${id}`)
      .then(r => setMission(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Real-time: dispatcher cancels this mission while driver is viewing it
  useEffect(() => {
    if (!socket) return;
    const handler = (data: { missionId?: string; status?: string }) => {
      if (data.missionId !== id || data.status !== 'cancelled') return;
      setMission(prev => prev ? { ...prev, status: 'cancelled', driverId: null } : prev);
    };
    socket.on('mission:status', handler);
    return () => { socket.off('mission:status', handler); };
  }, [socket, id]);

  function startGPS() {
    if (!navigator.geolocation || !mission) return;
    setGpsActive(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        api.patch(`/missions/${mission.id}/location`, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }).catch(console.error);
      },
      err => console.error('[GPS]', err),
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );
  }

  function stopGPS() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsActive(false);
  }

  // Auto-start GPS when in_progress, stop otherwise
  useEffect(() => {
    if (mission?.status === 'in_progress') startGPS();
    else stopGPS();
    return () => stopGPS();
  }, [mission?.status]);

  async function updateStatus(status: string) {
    if (!mission) return;
    setUpdating(true);
    try {
      await api.patch(`/missions/${mission.id}/status`, { status });
      setMission(prev => prev ? { ...prev, status } : prev);
    } catch (err) {
      console.error(err);
    } finally { setUpdating(false); }
  }

  async function handleReject() {
    if (!mission || !rejectReason) return;
    setRejecting(true);
    try {
      await api.patch(`/missions/${mission.id}/reject`, { reason: rejectReason });
      navigate('/missions');
    } catch (err) {
      console.error(err);
    } finally { setRejecting(false); }
  }

  if (loading) return (
    <div className="wf-phone" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="mono muted">Chargement…</span>
    </div>
  );

  if (!mission) return (
    <div className="wf-phone" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="mono muted">Mission introuvable</span>
    </div>
  );

  const actions = NEXT_ACTIONS[mission.status] ?? [];
  const statusLabel = STATUS_LABEL[mission.status] ?? mission.status;
  const hasCoords = mission.pickupLat !== 0 || mission.deliveryLat !== 0;

  return (
    <div className="wf-phone">
      {/* Header */}
      <div className="wf-phone-header">
        <span
          className="mono muted"
          style={{ fontSize: 12, cursor: 'pointer' }}
          onClick={() => navigate('/missions')}
        >
          ← Retour
        </span>
        <span className={`wf-pill ${STATUS_PILL[mission.status] ?? ''}`}>{statusLabel}</span>
      </div>

      <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Cancellation banner */}
        {mission.status === 'cancelled' && (
          <div className="wf-box" style={{ background: '#ffd9d9', borderStyle: 'solid', borderColor: 'var(--bad)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-script)', fontSize: 18, fontWeight: 700 }}>✕ Mission annulée par le dispatcher</div>
          </div>
        )}

        {/* Client + ID */}
        <div>
          <div className="script" style={{ fontSize: 26, lineHeight: 1 }}>{mission.clientName}</div>
          <div className="mono muted" style={{ fontSize: 10, marginTop: 2 }}>
            Mission {mission.id.slice(0, 8)} · {statusLabel}
          </div>
        </div>

        {/* Route */}
        <div className="wf-box solid" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>Enlèvement</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>📍 {mission.pickupAddress}</div>
          </div>
          <div style={{ borderTop: '1.2px dashed var(--ink-3)', margin: '0 -14px' }} />
          <div>
            <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>Livraison</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>🏁 {mission.deliveryAddress}</div>
          </div>
          {mission.deadline && (
            <>
              <div style={{ borderTop: '1.2px dashed var(--ink-3)', margin: '0 -14px' }} />
              <div className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>
                ⏱ Délai : {new Date(mission.deadline).toLocaleString('fr-FR')}
              </div>
            </>
          )}
        </div>

        {/* Embedded map */}
        {hasCoords && (
          <div style={{ height: 200, borderRadius: 10, overflow: 'hidden', border: '1.5px dashed var(--ink)' }}>
            <MapContainer
              center={[mission.deliveryLat, mission.deliveryLng]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              scrollWheelZoom={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap"
              />
              <Marker position={[mission.pickupLat, mission.pickupLng]} icon={pickupIcon}>
                <Popup>{mission.pickupAddress}</Popup>
              </Marker>
              <Marker position={[mission.deliveryLat, mission.deliveryLng]} icon={deliveryIcon}>
                <Popup>{mission.deliveryAddress}</Popup>
              </Marker>
              <FitBounds bounds={[[mission.pickupLat, mission.pickupLng], [mission.deliveryLat, mission.deliveryLng]]} />
            </MapContainer>
          </div>
        )}

        {/* External directions link */}
        {mission.deliveryLat !== 0 && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${mission.deliveryLat},${mission.deliveryLng}`}
            target="_blank"
            rel="noreferrer"
            className="wf-btn"
            style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}
          >
            🗺 Ouvrir l'itinéraire
          </a>
        )}

        {/* GPS status bar (in_progress only) */}
        {mission.status === 'in_progress' && (
          <div className="wf-box tint" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="mono" style={{ fontSize: 11 }}>
              <span style={{ marginRight: 5, color: gpsActive ? 'var(--good)' : 'var(--ink-3)' }}>●</span>
              {gpsActive ? 'Position partagée avec le dispatcher' : 'GPS inactif'}
            </span>
            <button className="wf-btn sm" onClick={gpsActive ? stopGPS : startGPS}>
              {gpsActive ? 'Pause' : '📍 Activer'}
            </button>
          </div>
        )}

        {/* Action buttons */}
        {actions.map(action => (
          <button
            key={action.status}
            disabled={updating}
            onClick={() => updateStatus(action.status)}
            className={`wf-btn ${action.variant}`}
            style={{ width: '100%', padding: '12px 0', fontSize: 14 }}
          >
            {updating ? 'Mise à jour…' : action.label}
          </button>
        ))}

        {/* Reject flow (assigned only) */}
        {mission.status === 'assigned' && (
          !showReject ? (
            <button
              className="wf-btn bad"
              style={{ width: '100%', padding: '12px 0', fontSize: 14 }}
              onClick={() => setShowReject(true)}
            >
              ✕ Refuser la mission
            </button>
          ) : (
            <div className="wf-box solid" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Motif de refus</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {REJECT_REASONS.map(r => (
                  <span
                    key={r}
                    className={`wf-pill${rejectReason === r ? ' fill' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setRejectReason(r)}
                  >
                    {r}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="wf-btn" style={{ flex: 1 }} onClick={() => { setShowReject(false); setRejectReason(''); }}>
                  Annuler
                </button>
                <button
                  className="wf-btn bad"
                  style={{ flex: 1 }}
                  disabled={!rejectReason || rejecting}
                  onClick={handleReject}
                >
                  {rejecting ? 'Refus…' : 'Confirmer'}
                </button>
              </div>
            </div>
          )
        )}

        {mission.status === 'completed' && (
          <div className="wf-box" style={{ background: '#e3f4dc', borderStyle: 'solid', borderColor: 'var(--good)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-script)', fontSize: 22, fontWeight: 700 }}>✓ Mission livrée</div>
          </div>
        )}

        {mission.status === 'completed' && (
          <div className="wf-box solid" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>📷 Photo de livraison</div>
            {mission.podPhotoUrl ? (
              <div className="mono" style={{ fontSize: 11, color: 'var(--good)' }}>✓ Photo envoyée</div>
            ) : (
              <PodUpload
                missionId={mission.id}
                onUploaded={() => setMission(prev => prev ? { ...prev, podPhotoUrl: 'uploaded' } : prev)}
              />
            )}
          </div>
        )}

        {mission.status === 'failed' && (
          <div className="wf-box" style={{ background: '#ffd9d9', borderStyle: 'solid', borderColor: 'var(--bad)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-script)', fontSize: 22, fontWeight: 700 }}>⚠ Mission échouée</div>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <nav className="wf-tabbar">
        <button className="wf-tabbar-btn active" onClick={() => navigate('/missions')}>
          <span style={{ fontSize: 18 }}>📋</span>
          <span>Missions</span>
        </button>
        <button className="wf-tabbar-btn" onClick={() => navigate('/chat')}>
          <span style={{ fontSize: 18 }}>💬</span>
          <span>Messagerie</span>
        </button>
      </nav>
    </div>
  );
}
