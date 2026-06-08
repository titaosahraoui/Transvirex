import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';

interface Driver {
  id: string; name: string; status: string;
  acceptanceRate: string; currentLoad: number; experienceDays: number;
  vehicleType: string; lat: number; lng: number;
}

const STATUS_LABEL: Record<string, string> = {
  available:  'Disponible',
  on_mission: 'En mission',
  offline:    'Hors ligne',
};
const STATUS_PILL: Record<string, string> = {
  available:  'good',
  on_mission: 'warn',
  offline:    '',
};

const mgmtNav = [
  'PERFORMANCE',
  { key: 'dash', icon: '📊', label: 'Tableau de bord', path: '/dashboard' },
  { key: 'sla',  icon: '⏱',  label: 'SLA & délais' },
  'FLOTTE',
  { key: 'drv',  icon: '🚐', label: 'Chauffeurs', path: '/drivers' },
  { key: 'geo',  icon: '🗺',  label: 'Géographie' },
];

function AcceptanceBar({ value }: { value: number }) {
  const pct   = Math.min(100, Math.max(0, value));
  const color = pct >= 80 ? 'var(--good)' : pct >= 50 ? 'var(--hi)' : 'var(--bad)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--paper-2)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--ink-3)' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span className="mono" style={{ fontSize: 10, minWidth: 30, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

export default function DriversPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drivers, setDrivers]     = useState<Driver[]>([]);
  const [loading, setLoading]     = useState(true);
  const [updating, setUpdating]   = useState<string | null>(null);

  useEffect(() => {
    api.get('/drivers')
      .then(r => {
        const list: Driver[] = r.data.data ?? [];
        list.sort((a, b) => parseFloat(b.acceptanceRate) - parseFloat(a.acceptanceRate));
        setDrivers(list);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(driverId: string, status: string) {
    setUpdating(driverId);
    try {
      await api.patch(`/drivers/${driverId}`, { status });
      setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, status } : d));
    } catch { console.error('Failed to update driver status'); }
    finally { setUpdating(null); }
  }

  const available = drivers.filter(d => d.status === 'available').length;
  const onMission = drivers.filter(d => d.status === 'on_mission').length;

  return (
    <div className="wf-shell">
      {/* Sidebar */}
      <aside className="wf-side">
        <div className="side-logo">transvirex</div>
        <div className="side-role">Direction · {user?.name}</div>
        {mgmtNav.map((item, i) => {
          if (typeof item === 'string') return <div key={i} className="side-group">{item}</div>;
          return (
            <div
              key={item.key}
              className={`side-nav ${item.key === 'drv' ? 'on' : ''}`}
              onClick={() => 'path' in item && item.path && navigate(item.path)}
            >
              <span className="ic">{item.icon}</span> {item.label}
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
          <span className="bar-crumbs">Flotte / Chauffeurs</span>
          <div className="bar-actions">
            <span className="wf-pill good">{available} disponible{available !== 1 ? 's' : ''}</span>
            <span className="wf-pill">{drivers.length} total</span>
          </div>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* KPI row */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Total chauffeurs', value: drivers.length, color: 'var(--ink)' },
              { label: 'Disponibles',      value: available,      color: 'var(--good)' },
              { label: 'En mission',       value: onMission,      color: 'var(--hi)' },
            ].map(k => (
              <div key={k.label} className="wf-box" style={{ flex: 1, textAlign: 'center', padding: '14px 8px' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: k.color, fontFamily: 'var(--font-script)' }}>{k.value}</div>
                <div className="mono muted" style={{ fontSize: 11, marginTop: 4 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          {loading ? (
            <div className="mono muted" style={{ textAlign: 'center', padding: 40 }}>Chargement…</div>
          ) : (
            <div className="wf-box" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="wf-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px dashed var(--ink)' }}>
                    {['Chauffeur', 'Statut', "Taux d'acceptation", 'Charge', 'Expérience', 'Véhicule', 'Position', 'Modifier statut'].map(h => (
                      <th key={h} className="mono" style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((d, i) => (
                    <tr key={d.id} style={{ borderBottom: i < drivers.length - 1 ? '1.2px dashed rgba(31,29,26,.12)' : 'none' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%', background: 'var(--hi)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 12, flexShrink: 0,
                          }}>
                            {d.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className={`wf-pill ${STATUS_PILL[d.status] ?? ''}`} style={{ fontSize: 11 }}>
                          {STATUS_LABEL[d.status] ?? d.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', minWidth: 130 }}>
                        <AcceptanceBar value={parseFloat(d.acceptanceRate) * 100} />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className="mono" style={{ fontSize: 12 }}>{+d.currentLoad}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className="mono" style={{ fontSize: 12 }}>{+d.experienceDays} j</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className="mono muted" style={{ fontSize: 11 }}>{d.vehicleType || '—'}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className="mono muted" style={{ fontSize: 10 }}>
                          {(+d.lat !== 0 || +d.lng !== 0)
                            ? `${(+d.lat).toFixed(3)}, ${(+d.lng).toFixed(3)}`
                            : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <select
                          className="wf-inp"
                          style={{ fontSize: 11, padding: '3px 6px' }}
                          value={d.status}
                          disabled={updating === d.id}
                          onChange={e => updateStatus(d.id, e.target.value)}
                        >
                          <option value="available">Disponible</option>
                          <option value="on_mission">En mission</option>
                          <option value="offline">Hors ligne</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {drivers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="mono muted" style={{ textAlign: 'center', padding: '32px 0', fontSize: 12 }}>
                        Aucun chauffeur enregistré
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
