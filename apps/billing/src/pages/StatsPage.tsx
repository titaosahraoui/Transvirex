import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';

interface Stats {
  draftCount: string; sentCount: string; paidCount: string;
  totalRevenue: string; avgDaysToPayment: string;
}

const billingNav = [
  'FACTURATION',
  { key: 'inv',   icon: '🧾', label: 'Factures',     path: '/invoices' },
  { key: 'stats', icon: '📊', label: 'Statistiques', path: '/stats' },
  { key: 'sla',   icon: '⏱',  label: 'SLA & Délais', path: '/sla' },
  'PARAMÈTRES',
  { key: 'set',   icon: '⚙',  label: 'Paramètres' },
];

export default function StatsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/billing/stats')
      .then(r => setStats(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const draft = stats ? parseInt(stats.draftCount, 10)  : 0;
  const sent  = stats ? parseInt(stats.sentCount,  10)  : 0;
  const paid  = stats ? parseInt(stats.paidCount,  10)  : 0;
  const total = draft + sent + paid;

  function pct(n: number) { return total === 0 ? 0 : Math.round((n / total) * 100); }
  function toRate(from: number, to: number) {
    return from === 0 ? '—' : `${Math.round((to / from) * 100)}%`;
  }

  return (
    <div className="wf-shell">
      {/* Sidebar */}
      <aside className="wf-side">
        <div className="side-logo">transvirex</div>
        <div className="side-role">Facturation · {user?.name}</div>
        {billingNav.map((item, i) => {
          if (typeof item === 'string') return <div key={i} className="side-group">{item}</div>;
          return (
            <div
              key={item.key}
              className={`side-nav ${item.key === 'stats' ? 'on' : ''}`}
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
          <span className="bar-crumbs">Facturation / Statistiques</span>
        </div>

        {loading ? (
          <div className="mono muted" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Chargement…
          </div>
        ) : (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800 }}>
            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {[
                { label: 'Brouillons',        value: String(draft), color: 'var(--ink-3)' },
                { label: 'Envoyées',          value: String(sent),  color: 'var(--hi)' },
                { label: 'Payées',            value: String(paid),  color: 'var(--good)' },
                {
                  label: 'CA total',
                  value: stats ? `${parseFloat(stats.totalRevenue).toLocaleString('fr-FR')}` : '—',
                  sub: 'DZD',
                  color: 'var(--accent)',
                },
                {
                  label: 'Délai moyen',
                  value: stats ? parseFloat(stats.avgDaysToPayment).toFixed(1) : '—',
                  sub: 'jours',
                  color: 'var(--ink)',
                },
              ].map(k => (
                <div key={k.label} className="wf-box" style={{ textAlign: 'center', padding: '14px 8px' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-script)', color: k.color }}>
                    {k.value}
                  </div>
                  {'sub' in k && k.sub && (
                    <div className="mono muted" style={{ fontSize: 9 }}>{k.sub}</div>
                  )}
                  <div className="mono muted" style={{ fontSize: 10, marginTop: 4 }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* Pipeline bar */}
            <div className="wf-box solid" style={{ padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Pipeline de facturation</div>

              {total === 0 ? (
                <div className="mono muted" style={{ fontSize: 12, textAlign: 'center', padding: '12px 0' }}>Aucune donnée</div>
              ) : (
                <>
                  {/* Stacked bar */}
                  <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden', border: '1.4px solid var(--ink)', marginBottom: 12 }}>
                    {[
                      { n: draft, color: 'var(--paper-2)', label: 'Brouillons' },
                      { n: sent,  color: 'var(--hi)',       label: 'Envoyées' },
                      { n: paid,  color: 'var(--good)',      label: 'Payées' },
                    ].filter(s => s.n > 0).map(s => (
                      <div
                        key={s.label}
                        style={{ width: `${pct(s.n)}%`, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title={`${s.label}: ${s.n} (${pct(s.n)}%)`}
                      >
                        <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: s.color === 'var(--paper-2)' ? 'var(--ink-3)' : '#fff' }}>
                          {pct(s.n)}%
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[
                      { label: `Brouillons (${draft})`, color: 'var(--paper-2)', border: 'var(--ink-3)' },
                      { label: `Envoyées (${sent})`,    color: 'var(--hi)',      border: 'transparent' },
                      { label: `Payées (${paid})`,      color: 'var(--good)',    border: 'transparent' },
                    ].map(l => (
                      <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 2, background: l.color, border: `1px solid ${l.border}` }} />
                        <span className="mono muted" style={{ fontSize: 10 }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Conversion funnel */}
            <div className="wf-box solid" style={{ padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Taux de conversion</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {[
                  { label: 'Créées', value: total,  color: 'var(--ink)'   },
                  { label: 'Envoyées', value: sent + paid, color: 'var(--hi)' },
                  { label: 'Payées', value: paid,   color: 'var(--good)'  },
                ].map((stage, i, arr) => (
                  <>
                    <div key={stage.label} style={{ textAlign: 'center', padding: '10px 16px' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-script)', color: stage.color }}>
                        {stage.value}
                      </div>
                      <div className="mono muted" style={{ fontSize: 10, marginTop: 2 }}>{stage.label}</div>
                    </div>
                    {i < arr.length - 1 && (
                      <div key={`arrow-${i}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <div style={{ fontSize: 18, color: 'var(--ink-3)' }}>→</div>
                        <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
                          {toRate(arr[i].value, arr[i + 1].value)}
                        </div>
                      </div>
                    )}
                  </>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
