import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import { dispatchNav } from '../lib/dispatchNav';

interface Driver {
  id: string;
  name: string;
  status: string;
}

interface Mission {
  id: string;
  clientName: string;
  driverId: string | null;
  deadline: string | null;
  status: string;
}

const HOUR_START = 8;
const HOUR_END   = 20;
const SPAN_MIN   = (HOUR_END - HOUR_START) * 60;

const BLOCK_COLOR: Record<string, { bg: string; border: string }> = {
  in_progress: { bg: 'var(--hi)',  border: 'orange' },
  assigned:    { bg: 'var(--hi)',  border: 'orange' },
  completed:   { bg: '#e3f4dc',    border: 'var(--good)' },
  failed:      { bg: '#ffd9d9',    border: 'var(--bad)' },
};

function missionBlock(mission: Mission): { left: string; width: string } | null {
  if (!mission.deadline) return null;
  const d = new Date(mission.deadline);
  const totalMin = d.getHours() * 60 + d.getMinutes();
  const pct = Math.max(0, Math.min(100, ((totalMin - 10 - HOUR_START * 60) / SPAN_MIN) * 100));
  return { left: `${pct}%`, width: '9%' };
}

const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

const STATUS_LABEL: Record<string, string> = {
  assigned: 'Assignée', in_progress: 'En route', completed: 'Livrée',
  failed: 'Échec', pending: 'En attente',
};
const STATUS_PILL: Record<string, string> = {
  assigned: 'warn', in_progress: 'warn', completed: 'good', failed: 'bad', pending: '',
};

export default function PlanningPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drivers, setDrivers]   = useState<Driver[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading]   = useState(true);
  const [today, setToday]       = useState(new Date());

  useEffect(() => {
    Promise.all([
      api.get('/drivers'),
      api.get('/missions?limit=100'),
    ])
      .then(([dRes, mRes]) => {
        setDrivers(dRes.data.data ?? []);
        setMissions(mRes.data.data.items ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function shiftDay(delta: number) {
    setToday(d => { const n = new Date(d); n.setDate(n.getDate() + delta); return n; });
  }

  const missionsByDriver = (driverId: string) => missions.filter(m => m.driverId === driverId);

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
              className={`side-nav ${item.key === 'plan' ? 'on' : ''}`}
              onClick={() => item.path && navigate(item.path)}
            >
              <span className="ic">{item.icon}</span>
              {item.label}
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
          <span className="bar-crumbs">
            Planning du {today.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
          </span>
          <div className="bar-actions">
            <span className="wf-pill" style={{ cursor: 'pointer' }} onClick={() => shiftDay(-1)}>‹ Jour précédent</span>
            <span className="wf-pill warn" style={{ cursor: 'pointer' }} onClick={() => setToday(new Date())}>Aujourd'hui</span>
            <span className="wf-pill" style={{ cursor: 'pointer' }} onClick={() => shiftDay(1)}>Jour suivant ›</span>
          </div>
        </div>

        {loading ? (
          <div className="mono muted" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Chargement…
          </div>
        ) : (
          <div style={{ padding: '12px 16px', overflowX: 'auto', flex: 1 }}>
            {/* Timeline header */}
            <div style={{ display: 'flex', marginBottom: 4 }}>
              <div style={{ width: 170, flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                {HOURS.map(h => (
                  <div
                    key={h}
                    className="mono muted"
                    style={{ flex: 1, fontSize: 10, textAlign: 'left', paddingLeft: 2, borderLeft: '1px dashed rgba(31,29,26,.15)' }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>
            </div>

            {/* Driver lanes */}
            {drivers.map(driver => {
              const dMissions = missionsByDriver(driver.id);
              const positioned = dMissions.filter(m => missionBlock(m) !== null);
              const noDeadline = dMissions.filter(m => !m.deadline);

              return (
                <div key={driver.id} style={{ display: 'flex', marginBottom: 6, minHeight: 52 }}>
                  {/* Driver cell */}
                  <div style={{
                    width: 170, flexShrink: 0, display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', paddingRight: 10,
                    borderRight: '1.4px dashed var(--ink-3)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%', background: 'var(--hi)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 11, flexShrink: 0,
                      }}>
                        {driver.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{driver.name}</div>
                        <div className="mono muted" style={{ fontSize: 9 }}>🚐</div>
                      </div>
                    </div>
                    {noDeadline.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                        {noDeadline.map(m => (
                          <span
                            key={m.id}
                            className={`wf-pill ${STATUS_PILL[m.status] ?? ''}`}
                            style={{ fontSize: 9, cursor: 'pointer' }}
                            onClick={() => navigate(`/missions/${m.id}`)}
                          >
                            {m.clientName.split(' ')[0]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lane */}
                  <div style={{ flex: 1, position: 'relative', background: 'rgba(255,253,246,.6)', margin: '0 0 0 0' }}>
                    {/* Hour grid lines */}
                    {HOURS.map(h => (
                      <div
                        key={h}
                        style={{
                          position: 'absolute', left: `${((h - HOUR_START) / (HOUR_END - HOUR_START)) * 100}%`,
                          top: 0, bottom: 0, width: '1px', background: 'rgba(31,29,26,.08)',
                        }}
                      />
                    ))}

                    {dMissions.length === 0 && (
                      <div className="mono muted" style={{ fontSize: 11, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
                        — Disponible —
                      </div>
                    )}

                    {/* Positioned blocks */}
                    {positioned.map(m => {
                      const pos = missionBlock(m)!;
                      const colors = BLOCK_COLOR[m.status] ?? { bg: 'var(--paper-2)', border: 'var(--ink-3)' };
                      return (
                        <div
                          key={m.id}
                          style={{
                            position: 'absolute', ...pos, top: 4, bottom: 4,
                            background: colors.bg,
                            border: `1.5px solid ${colors.border}`,
                            borderRadius: 5, overflow: 'hidden', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', paddingLeft: 4,
                          }}
                          onClick={() => navigate(`/missions/${m.id}`)}
                          title={`${m.clientName} · ${STATUS_LABEL[m.status] ?? m.status}`}
                        >
                          <span style={{ fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.clientName.split(' ')[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {drivers.length === 0 && (
              <div className="mono muted" style={{ textAlign: 'center', padding: 40 }}>Aucun chauffeur enregistré</div>
            )}

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 16, padding: '10px 0', borderTop: '1.3px dashed var(--ink-3)' }}>
              {[
                { color: 'var(--hi)', border: 'orange', label: 'En route / Assignée' },
                { color: '#e3f4dc',   border: 'var(--good)', label: 'Livrée' },
                { color: '#ffd9d9',   border: 'var(--bad)',  label: 'Incident' },
                { color: 'var(--paper-2)', border: 'var(--ink-3)', label: 'En attente' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 16, height: 10, borderRadius: 2, background: l.color, border: `1.5px solid ${l.border}` }} />
                  <span className="mono muted" style={{ fontSize: 10 }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
