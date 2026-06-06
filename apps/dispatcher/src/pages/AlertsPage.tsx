import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { dispatchNav } from '../lib/dispatchNav';

interface Mission {
  id: string;
  clientName: string;
  pickupAddress: string;
  deliveryAddress: string;
  deadline: string | null;
  status: string;
  driverId: string | null;
}

interface FeedEvent {
  missionId: string;
  status: string;
  receivedAt: Date;
}

const STATUS_ICON: Record<string, string> = {
  failed:      '📥',
  completed:   '✓',
  in_progress: '⚠',
  cancelled:   '✕',
};

function slaPercent(missions: Mission[]): number {
  const done = missions.filter(m => m.status === 'completed' || m.status === 'failed');
  if (done.length === 0) return 100;
  const onTime = done.filter(m => {
    if (m.status !== 'completed' || !m.deadline) return false;
    return true;
  }).length;
  return Math.round((onTime / done.length) * 100);
}

export default function AlertsPage() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const socketRef = useSocket(token);
  const [incidents, setIncidents] = useState<Mission[]>([]);
  const [overdue, setOverdue]     = useState<Mission[]>([]);
  const [feed, setFeed]           = useState<FeedEvent[]>([]);
  const [allMissions, setAllMissions] = useState<Mission[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const now = new Date();
    Promise.all([
      api.get('/missions?status=failed&limit=50'),
      api.get('/missions?status=in_progress&limit=100'),
      api.get('/missions?limit=200'),
    ])
      .then(([failRes, inpRes, allRes]) => {
        setIncidents(failRes.data.data.items ?? []);
        const inpItems: Mission[] = inpRes.data.data.items ?? [];
        setOverdue(inpItems.filter(m => m.deadline && new Date(m.deadline) < now));
        setAllMissions(allRes.data.data.items ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Live feed via socket
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const handler = (data: { missionId?: string; status?: string }) => {
      if (!data.missionId || !data.status) return;
      setFeed(prev => [
        { missionId: data.missionId!, status: data.status!, receivedAt: new Date() },
        ...prev,
      ].slice(0, 50));
    };
    socket.on('mission:status', handler);
    return () => { socket.off('mission:status', handler); };
  }, [socketRef.current]);

  const sla = slaPercent(allMissions);

  function delayLabel(deadline: string): string {
    const diff = Math.round((Date.now() - new Date(deadline).getTime()) / 60000);
    return diff < 60 ? `${diff} min de retard` : `${Math.round(diff / 60)} h de retard`;
  }

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
              className={`side-nav ${item.key === 'alert' ? 'on' : ''}`}
              onClick={() => item.path && navigate(item.path)}
            >
              <span className="ic">{item.icon}</span>
              {item.label}
              {item.key === 'alert' && (incidents.length + overdue.length) > 0 && (
                <span className="side-tag" style={{ background: 'var(--bad)', color: '#fff' }}>
                  {incidents.length + overdue.length}
                </span>
              )}
            </div>
          );
        })}
        <div className="side-bottom">
          <div className="side-logout" onClick={logout}>↩ Déconnexion</div>
        </div>
      </aside>

      {/* Main */}
      <div className="wf-shell-main">
        <div className="wf-appbar">
          <span className="bar-crumbs">Opérations / Alertes</span>
          <div className="bar-actions">
            {(incidents.length + overdue.length) > 0 && (
              <span className="wf-pill bad">{incidents.length + overdue.length} alerte{incidents.length + overdue.length > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="mono muted" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Chargement…
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', gap: 16, padding: 16, overflow: 'hidden' }}>
            {/* Left panel */}
            <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
              {/* KPI row */}
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { label: 'Incidents',  value: incidents.length, color: 'var(--bad)' },
                  { label: 'Retards',    value: overdue.length,   color: 'var(--hi)' },
                  { label: 'SLA',        value: `${sla}%`,        color: sla >= 80 ? 'var(--good)' : sla >= 60 ? 'var(--hi)' : 'var(--bad)' },
                ].map(k => (
                  <div key={k.label} className="wf-box" style={{ flex: 1, textAlign: 'center', padding: '14px 8px' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: k.color, fontFamily: 'var(--font-script)' }}>{k.value}</div>
                    <div className="mono muted" style={{ fontSize: 11, marginTop: 4 }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Incidents */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Incidents</div>
                {incidents.length === 0 ? (
                  <div className="wf-box tint" style={{ textAlign: 'center', padding: '20px 0' }}>
                    <span className="mono muted" style={{ fontSize: 12 }}>Aucun incident signalé ✓</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {incidents.map(m => (
                      <div key={m.id} className="wf-box" style={{ background: '#ffd9d9', borderStyle: 'solid', borderColor: 'var(--bad)', padding: '10px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>📥 {m.clientName}</div>
                            <div className="mono muted" style={{ fontSize: 10.5, marginTop: 3 }}>
                              {m.id.slice(0, 8)} · {m.pickupAddress}
                            </div>
                            <div className="mono muted" style={{ fontSize: 10.5 }}>🏁 {m.deliveryAddress}</div>
                          </div>
                          <button
                            className="wf-btn sm"
                            onClick={() => navigate(`/missions/${m.id}`)}
                          >
                            Voir mission
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Retards */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Retards</div>
                {overdue.length === 0 ? (
                  <div className="wf-box tint" style={{ textAlign: 'center', padding: '20px 0' }}>
                    <span className="mono muted" style={{ fontSize: 12 }}>Aucun retard en cours ✓</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {overdue.map(m => (
                      <div key={m.id} className="wf-box" style={{ background: '#fff8e1', borderStyle: 'solid', borderColor: 'var(--hi)', padding: '10px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>⚠ {m.clientName}</div>
                            <div className="mono" style={{ fontSize: 10.5, color: 'var(--bad)', marginTop: 3 }}>
                              {m.deadline ? delayLabel(m.deadline) : ''}
                            </div>
                            <div className="mono muted" style={{ fontSize: 10.5 }}>{m.pickupAddress}</div>
                          </div>
                          <button
                            className="wf-btn sm"
                            onClick={() => navigate(`/missions/${m.id}`)}
                          >
                            Voir mission
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right panel — live feed */}
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: 14, flexShrink: 0 }}>Flux temps réel</div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {feed.length === 0 && (
                  <div className="mono muted" style={{ fontSize: 12, textAlign: 'center', paddingTop: 32 }}>
                    En attente d'événements…
                  </div>
                )}
                {feed.map((ev, i) => (
                  <div
                    key={i}
                    className="wf-box"
                    style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>
                      {STATUS_ICON[ev.status] ?? '→'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mono" style={{ fontSize: 11, fontWeight: 600 }}>
                        {ev.missionId.slice(0, 8)}
                      </div>
                      <div className="mono muted" style={{ fontSize: 10 }}>{ev.status}</div>
                    </div>
                    <div className="mono muted" style={{ fontSize: 10, flexShrink: 0 }}>
                      {ev.receivedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
