import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

interface BillingStats {
  draftCount: string; sentCount: string; paidCount: string;
  totalRevenue: string; avgDaysToPayment: string;
}
interface Driver {
  id: string; name: string; status: string;
  acceptanceRate: string; currentLoad: number; experienceDays: number;
}
interface Mission { id: string; status: string; createdAt: string; }

const DRIVER_STATUS_LABEL: Record<string, string> = {
  available: 'Disponible', on_mission: 'En mission', offline: 'Hors ligne',
};
const DRIVER_STATUS_PILL: Record<string, string> = {
  available: 'good', on_mission: 'warn', offline: '',
};
const PIE_COLORS = ['var(--ink-3)', 'var(--hi)', 'var(--accent)', 'var(--good)', 'var(--bad)'];

const mgmtNav = [
  'PERFORMANCE',
  { key: 'dash',  icon: '📊', label: 'Tableau de bord', path: '/dashboard' },
  { key: 'sla',   icon: '⏱',  label: 'SLA & délais', path: '/sla' },
  'FLOTTE',
  { key: 'drv',   icon: '🚐', label: 'Chauffeurs', path: '/drivers' },
  { key: 'geo',   icon: '🗺',  label: 'Géographie', path: '/geo' },
  'ADMINISTRATION',
  { key: 'team', icon: '👥', label: 'Équipe',       path: '/team' },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats]     = useState<BillingStats | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);

  useEffect(() => {
    api.get('/billing/stats').then(r => setStats(r.data.data)).catch(console.error);
    api.get('/drivers').then(r => setDrivers(r.data.data)).catch(console.error);
    api.get('/missions?limit=500').then(r => setMissions(r.data.data.items)).catch(console.error);
  }, []);

  const statusCounts = ['pending','assigned','in_progress','completed','failed'].map((s, i) => ({
    name: ['À assigner','Assignées','En route','Livrées','Échecs'][i],
    value: missions.filter(m => m.status === s).length,
  })).filter(s => s.value > 0);

  const sortedDrivers = [...drivers].sort(
    (a, b) => parseFloat(b.acceptanceRate) - parseFloat(a.acceptanceRate)
  );

  const kpis = [
    { label: 'Revenu total',        value: stats ? `${parseFloat(stats.totalRevenue).toLocaleString('fr-FR')} DZD` : '—', icon: '💰' },
    { label: 'Factures payées',     value: stats?.paidCount ?? '—',                                                        icon: '✅' },
    { label: 'En attente paiement', value: stats ? String(+stats.draftCount + +stats.sentCount) : '—',                     icon: '⏳' },
    { label: 'Délai moyen',         value: stats ? `${parseFloat(stats.avgDaysToPayment).toFixed(1)} j` : '—',             icon: '📅' },
    { label: 'Total missions',      value: String(missions.length),                                                         icon: '📋' },
    { label: 'Chauffeurs actifs',   value: String(drivers.filter(d => d.status === 'available').length),                   icon: '🚐' },
  ];

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
              className={`side-nav ${item.key === 'dash' ? 'on' : ''}`}
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
      <main className="wf-shell-main">
        <div className="wf-appbar">
          <span className="bar-crumbs">Direction / Tableau de bord</span>
          <div className="bar-actions">
            <span className="mono muted" style={{ fontSize: 11 }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </div>

        <div className="wf-shell-content">
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 18 }}>
            {kpis.map(kpi => (
              <div key={kpi.label} className="wf-kpi">
                <div style={{ fontSize: 20, marginBottom: 4 }}>{kpi.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-script)' }}>{kpi.value}</div>
                <div className="mono muted" style={{ fontSize: 10, marginTop: 2 }}>{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            {/* Pie */}
            <div className="wf-box solid" style={{ padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Répartition des missions</div>
              {statusCounts.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} label>
                      {statusCounts.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="mono muted" style={{ textAlign: 'center', padding: '40px 0', fontSize: 11 }}>Aucune donnée</div>
              )}
            </div>

            {/* Bar */}
            <div className="wf-box solid" style={{ padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Pipeline facturation</div>
              {stats ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { name: 'Brouillon', count: parseInt(stats.draftCount) },
                    { name: 'Envoyée',   count: parseInt(stats.sentCount)  },
                    { name: 'Payée',     count: parseInt(stats.paidCount)  },
                  ]} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--paper-3)" />
                    <XAxis dataKey="name" tick={{ fontFamily: 'var(--font-mono)', fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontFamily: 'var(--font-mono)', fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--hi)" stroke="var(--ink)" strokeWidth={1.2} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="mono muted" style={{ textAlign: 'center', padding: '40px 0', fontSize: 11 }}>Chargement…</div>
              )}
            </div>
          </div>

          {/* Driver table */}
          <div className="wf-box solid" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1.3px dashed rgba(31,29,26,.2)', fontWeight: 700, fontSize: 13 }}>
              Performance chauffeurs
            </div>
            <table className="wf-table">
              <thead>
                <tr>
                  {['Chauffeur', 'Statut', 'Taux d\'acceptation', 'Charge actuelle', 'Expérience'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedDrivers.map(d => (
                  <tr key={d.id}>
                    <td><b>{d.name}</b></td>
                    <td>
                      <span className={`wf-pill ${DRIVER_STATUS_PILL[d.status] ?? ''}`} style={{ fontSize: 10 }}>
                        {DRIVER_STATUS_LABEL[d.status] ?? d.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--paper-3)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${parseFloat(d.acceptanceRate)}%`,
                            background: parseFloat(d.acceptanceRate) >= 80 ? 'var(--good)' : parseFloat(d.acceptanceRate) >= 60 ? 'var(--hi)' : 'var(--bad)',
                          }} />
                        </div>
                        <span className="mono" style={{ fontSize: 10 }}>{parseFloat(d.acceptanceRate).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>{d.currentLoad} course{d.currentLoad !== 1 ? 's' : ''}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{d.experienceDays} j</td>
                  </tr>
                ))}
                {sortedDrivers.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '24px 0' }}>
                      Aucun chauffeur trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
