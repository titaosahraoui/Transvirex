import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';

interface Mission {
  id: string; clientName: string; pickupAddress: string;
  deliveryAddress: string; deadline: string | null; status: string;
  driverId: string | null; createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  assigned: 'Assignée', in_progress: 'En route', completed: 'Livrée', failed: 'Échec',
};
const STATUS_PILL: Record<string, string> = {
  assigned: 'warn', in_progress: 'warn', completed: 'good', failed: 'bad',
};

export default function MissionsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const driverRes = await api.get(`/drivers/by-user/${user.id}`);
      const driverId: string = driverRes.data.data.id;
      const url = filter === 'all'
        ? `/missions?driverId=${driverId}`
        : `/missions?driverId=${driverId}&status=${filter}`;
      const r = await api.get(url);
      setMissions(r.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user, filter]);

  useEffect(() => { load(); }, [load]);

  const filters = [
    { key: 'all',         label: 'Toutes' },
    { key: 'assigned',    label: 'Assignées' },
    { key: 'in_progress', label: 'En route' },
    { key: 'completed',   label: 'Livrées' },
  ];

  return (
    <div className="wf-phone">
      {/* Header */}
      <div className="wf-phone-header">
        <div>
          <div className="mono muted" style={{ fontSize: 10 }}>Bonjour,</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{user?.name}</div>
        </div>
        <span className="mono muted" style={{ fontSize: 11, cursor: 'pointer' }} onClick={logout}>
          ↩ Déco
        </span>
      </div>

      {/* Title */}
      <div style={{ padding: '16px 16px 8px' }}>
        <div className="script" style={{ fontSize: 26 }}>Mes missions</div>
        <div className="mono muted" style={{ fontSize: 10.5 }}>{missions.length} course{missions.length !== 1 ? 's' : ''} trouvée{missions.length !== 1 ? 's' : ''}</div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 12px', overflowX: 'auto' }}>
        {filters.map(f => (
          <span
            key={f.key}
            className={`wf-pill${filter === f.key ? ' fill' : ''}`}
            style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </span>
        ))}
      </div>

      {/* Mission cards */}
      <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && (
          <div className="mono muted" style={{ textAlign: 'center', padding: '32px 0', fontSize: 12 }}>
            Chargement…
          </div>
        )}
        {!loading && missions.length === 0 && (
          <div className="wf-box tint" style={{ textAlign: 'center', padding: '24px 0' }}>
            <div className="mono muted" style={{ fontSize: 12 }}>Aucune mission trouvée</div>
          </div>
        )}
        {missions.map(m => (
          <div
            key={m.id}
            className="wf-box solid"
            style={{ cursor: 'pointer', padding: '10px 12px' }}
            onClick={() => navigate(`/missions/${m.id}`)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>
                {m.id.slice(0, 8)}
              </span>
              <span className={`wf-pill ${STATUS_PILL[m.status] ?? ''}`} style={{ fontSize: 10 }}>
                {STATUS_LABEL[m.status] ?? m.status}
              </span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{m.clientName}</div>
            <div className="mono muted" style={{ fontSize: 10.5 }}>📍 {m.pickupAddress}</div>
            <div className="mono muted" style={{ fontSize: 10.5, marginTop: 2 }}>🏁 {m.deliveryAddress}</div>
            {m.deadline && (
              <div className="mono" style={{ fontSize: 10, color: 'var(--accent)', marginTop: 6 }}>
                ⏱ {new Date(m.deadline).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        ))}
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
