import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { dispatchNav } from '../lib/dispatchNav';

interface Mission {
  id: string;
  clientName: string;
  pickupAddress: string;
  deliveryAddress: string;
  deadline: string | null;
  status: string;
  driverId: string | null;
  createdAt: string;
  price: string;
  missionType: string;
  priority: string;
}

const PRIORITY_PILL: Record<string, { label: string; cls: string }> = {
  low:    { label: 'Faible',  cls: '' },
  high:   { label: 'Haute',   cls: 'warn' },
  urgent: { label: 'Urgente', cls: 'bad' },
};

const COLUMNS = [
  { key: 'pending',     label: 'À assigner',    accent: 'var(--ink-3)' },
  { key: 'assigned',   label: 'Prises en charge', accent: 'var(--hi)' },
  { key: 'in_progress',label: 'En route',        accent: 'var(--accent)' },
  { key: 'completed',  label: 'Livrées',         accent: 'var(--good)' },
  { key: 'failed',     label: 'Échecs',          accent: 'var(--bad)' },
  { key: 'cancelled',  label: 'Annulées',        accent: 'var(--bad)' },
];

const STATUS_PILL: Record<string, string> = {
  pending:     '',
  assigned:    'warn',
  in_progress: 'warn',
  completed:   'good',
  failed:      'bad',
  cancelled:   'bad',
};

export default function BoardPage() {
  const { user, logout } = useAuth();
  const { socket } = useNotification();
  const navigate = useNavigate();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');

  const load = useCallback(async () => {
    try {
      const r = await api.get('/missions?limit=100');
      setMissions(r.data.data.items);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  // Real-time: refresh board immediately when a driver updates mission status
  useEffect(() => {
    if (!socket) return;
    socket.on('mission:status', load);
    return () => { socket.off('mission:status', load); };
  }, [socket, load]);

  const byStatus = (status: string) => missions.filter(m => m.status === status);
  const total = missions.length;
  const counts = Object.fromEntries(COLUMNS.map(c => [c.key, byStatus(c.key).length]));

  return (
    <div className="wf-shell">
      {/* Sidebar */}
      <aside className="wf-side">
        <div className="side-logo">transvirex</div>
        <div className="side-role">Dispatcher · {user?.name}</div>

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
              {item.key === 'miss' && <span className="side-tag">{total}</span>}
            </div>
          );
        })}

        <div className="side-bottom">
          <div className="side-logout" onClick={logout}>↩ Déconnexion</div>
        </div>
      </aside>

      {/* Main */}
      <div className="wf-shell-main">
        {/* AppBar */}
        <div className="wf-appbar">
          <span className="bar-crumbs">Opérations / Missions du jour</span>
          <div className="bar-actions">
            {/* Socket connection indicator */}
            <span
              title={socket?.connected ? 'Temps réel actif' : 'Hors ligne'}
              style={{
                width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                background: socket?.connected ? 'var(--good)' : 'var(--ink-3)',
                flexShrink: 0,
              }}
            />
            {/* Quick filter pills */}
            <span
              className={`wf-pill${filter === 'all' ? ' warn' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setFilter('all')}
            >
              Toutes · {total}
            </span>
            {COLUMNS.slice(0, 3).map(c => (
              <span
                key={c.key}
                className={`wf-pill${filter === c.key ? ' fill' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setFilter(c.key)}
              >
                {c.label} · {counts[c.key]}
              </span>
            ))}
            <button className="wf-btn fill" onClick={() => navigate('/missions/new')}>＋ Nouvelle mission</button>
          </div>
        </div>

        {/* Kanban */}
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="mono muted">Chargement…</span>
          </div>
        ) : (
          <div style={{
            flex: 1, display: 'flex', gap: 12, padding: '16px',
            overflowX: 'auto', alignItems: 'flex-start',
          }}>
            {COLUMNS.filter(c => filter === 'all' || c.key === filter).map(col => {
              const cards = byStatus(col.key);
              return (
                <div key={col.key} style={{
                  flexShrink: 0, width: 260,
                  border: '1.6px dashed var(--ink)', borderRadius: 10,
                  background: '#fffdf6', display: 'flex', flexDirection: 'column',
                  borderTop: `3px solid ${col.accent}`,
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px 6px',
                    borderBottom: '1.3px dashed rgba(31,29,26,.2)',
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{col.label}</span>
                    <span className="wf-pill">{cards.length}</span>
                  </div>

                  <div style={{ padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
                    {cards.map(m => (
                      <div
                        key={m.id}
                        className="wf-box solid"
                        style={{ cursor: 'pointer', padding: '8px 10px' }}
                        onClick={() => navigate(`/missions/${m.id}`)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>
                            {m.id.slice(0, 8)}
                          </span>
                          <span className={`wf-pill ${STATUS_PILL[m.status]}`}>
                            {col.label.split(' ')[0]}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{m.clientName}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>
                          📍 {m.pickupAddress}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)', marginTop: 2 }}>
                          🏁 {m.deliveryAddress}
                        </div>
                        {m.deadline && (
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', marginTop: 4 }}>
                            ⏱ {new Date(m.deadline).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                          {m.price && parseFloat(m.price) > 0 && (
                            <span className="mono" style={{ fontSize: 9, color: 'var(--good)', fontWeight: 700 }}>
                              {parseFloat(m.price).toLocaleString('fr-FR')} DZD
                            </span>
                          )}
                          {m.priority && PRIORITY_PILL[m.priority] && (
                            <span className={`wf-pill ${PRIORITY_PILL[m.priority].cls}`} style={{ fontSize: 9 }}>
                              {PRIORITY_PILL[m.priority].label}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {cards.length === 0 && (
                      <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', padding: '16px 0' }}>
                        — vide —
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
