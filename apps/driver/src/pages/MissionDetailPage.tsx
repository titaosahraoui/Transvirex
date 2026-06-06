import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../context/AuthContext';

interface Mission {
  id: string; clientName: string; pickupAddress: string;
  pickupLat: number; pickupLng: number; deliveryAddress: string;
  deliveryLat: number; deliveryLng: number;
  deadline: string | null; status: string; driverId: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  assigned: 'Assignée', in_progress: 'En route', completed: 'Livrée', failed: 'Échec',
};
const STATUS_PILL: Record<string, string> = {
  assigned: 'warn', in_progress: 'warn', completed: 'good', failed: 'bad',
};

const NEXT_ACTIONS: Record<string, { label: string; status: string; variant: string }[]> = {
  assigned: [
    { label: '✅ Accepter la mission', status: 'in_progress', variant: 'good' },
    { label: '✕ Refuser',             status: 'pending',     variant: 'bad'  },
  ],
  in_progress: [
    { label: '✅ Marquer comme livrée',   status: 'completed', variant: 'good' },
    { label: '⚠ Signaler un incident',    status: 'failed',    variant: 'warn' },
  ],
};

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mission, setMission]   = useState<Mission | null>(null);
  const [loading, setLoading]   = useState(true);
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
        navigate('/missions');
      } else {
        setMission(prev => prev ? { ...prev, status } : prev);
      }
    } catch (err) {
      console.error(err);
    } finally { setUpdating(false); }
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

        {/* Maps link */}
        {mission.deliveryLat && (
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

        {mission.status === 'completed' && (
          <div className="wf-box" style={{ background: '#e3f4dc', borderStyle: 'solid', borderColor: 'var(--good)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-script)', fontSize: 22, fontWeight: 700 }}>✓ Mission livrée</div>
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
