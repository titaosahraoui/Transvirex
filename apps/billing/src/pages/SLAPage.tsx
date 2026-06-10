import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';

interface AgingBucket { count: number; amount: string; }
interface SlaData {
  slaRate: number;
  paidCount: number;
  paidOnTimeCount: number;
  overdueCount: number;
  overdueAmount: string;
  avgDaysToPay: number;
  aging: {
    '0_30': AgingBucket;
    '31_60': AgingBucket;
    '61_90': AgingBucket;
    '90plus': AgingBucket;
  };
  overdueInvoices: {
    id: string; reference?: string; clientName: string;
    amount: string; generatedAt: string; daysOld: number;
  }[];
}

const billingNav = [
  'FACTURATION',
  { key: 'inv',   icon: '🧾', label: 'Factures',     path: '/invoices' },
  { key: 'stats', icon: '📊', label: 'Statistiques', path: '/stats' },
  { key: 'sla',   icon: '⏱',  label: 'SLA & Délais', path: '/sla' },
  'PARAMÈTRES',
  { key: 'set',   icon: '⚙',  label: 'Paramètres' },
];

const AGING_BUCKETS = [
  { key: '0_30'  as const, label: '0 – 30 j',  sublabel: 'Récentes',   color: 'var(--hi)'   },
  { key: '31_60' as const, label: '31 – 60 j', sublabel: 'En retard',  color: '#f97316'     },
  { key: '61_90' as const, label: '61 – 90 j', sublabel: 'Critique',   color: 'var(--bad)'  },
  { key: '90plus'as const, label: '90+ j',     sublabel: 'Contentieux',color: '#7f1d1d'     },
];

function SlaRing({ rate }: { rate: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - rate / 100);
  const color = rate >= 80 ? 'var(--good)' : rate >= 60 ? 'var(--hi)' : 'var(--bad)';
  return (
    <svg viewBox="0 0 100 100" width={140} height={140} aria-label={`SLA ${rate}%`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--paper-2)" strokeWidth="10" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset .6s ease' }}
      />
      <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="700" fontFamily="var(--font-script)" fill={color}>
        {rate}%
      </text>
      <text x="50" y="60" textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill="var(--ink-3)">
        payé ≤ 30 j
      </text>
    </svg>
  );
}

export default function SLAPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData]     = useState<SlaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/billing/sla')
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalAging = data
    ? AGING_BUCKETS.reduce((s, b) => s + data.aging[b.key].count, 0)
    : 0;

  return (
    <div className="wf-shell">
      <aside className="wf-side">
        <div className="side-logo">transvirex</div>
        <div className="side-role">Facturation · {user?.name}</div>
        {billingNav.map((item, i) => {
          if (typeof item === 'string') return <div key={i} className="side-group">{item}</div>;
          return (
            <div
              key={item.key}
              className={`side-nav ${item.key === 'sla' ? 'on' : ''}`}
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

      <main className="wf-shell-main">
        <div className="wf-appbar">
          <span className="bar-crumbs">Facturation / SLA & Délais</span>
        </div>

        {loading ? (
          <div className="mono muted" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Chargement…
          </div>
        ) : !data ? null : (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>

            {/* ── KPI row ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                {
                  label: 'Taux SLA',
                  value: `${data.slaRate}%`,
                  sub: `${data.paidOnTimeCount} / ${data.paidCount} factures`,
                  color: data.slaRate >= 80 ? 'var(--good)' : data.slaRate >= 60 ? 'var(--hi)' : 'var(--bad)',
                },
                {
                  label: 'Factures en attente',
                  value: String(data.overdueCount),
                  sub: `${parseFloat(data.overdueAmount).toLocaleString('fr-FR')} DZD`,
                  color: data.overdueCount > 0 ? 'var(--bad)' : 'var(--good)',
                },
                {
                  label: 'Délai moyen paiement',
                  value: `${data.avgDaysToPay}`,
                  sub: 'jours',
                  color: data.avgDaysToPay <= 30 ? 'var(--good)' : data.avgDaysToPay <= 60 ? 'var(--hi)' : 'var(--bad)',
                },
                {
                  label: 'Objectif SLA',
                  value: '30 j',
                  sub: 'délai contractuel',
                  color: 'var(--ink-3)',
                },
              ].map(k => (
                <div key={k.label} className="wf-box" style={{ textAlign: 'center', padding: '14px 8px' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-script)', color: k.color }}>
                    {k.value}
                  </div>
                  <div className="mono muted" style={{ fontSize: 9, marginTop: 2 }}>{k.sub}</div>
                  <div className="mono muted" style={{ fontSize: 10, marginTop: 4 }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* ── Ring + Aging side by side ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 12 }}>

              {/* SLA ring */}
              <div className="wf-box solid" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px', gap: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 13, alignSelf: 'flex-start' }}>Conformité SLA</div>
                <SlaRing rate={data.slaRate} />
                <div style={{ textAlign: 'center' }}>
                  <div className="mono muted" style={{ fontSize: 10 }}>
                    Factures payées dans les 30 jours
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'center' }}>
                    {[
                      { color: 'var(--good)', label: '≥ 80% Bon' },
                      { color: 'var(--hi)',   label: '60–79% Moyen' },
                      { color: 'var(--bad)',  label: '< 60% Critique' },
                    ].map(l => (
                      <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                        <span className="mono muted" style={{ fontSize: 9 }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Aging breakdown */}
              <div className="wf-box solid" style={{ padding: '16px 18px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Ancienneté des impayés</div>

                {totalAging === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <div style={{ fontSize: 24 }}>✓</div>
                    <div className="mono muted" style={{ fontSize: 11, marginTop: 6 }}>Aucune facture en attente</div>
                  </div>
                ) : (
                  <>
                    {/* Stacked bar */}
                    <div style={{ display: 'flex', height: 20, borderRadius: 4, overflow: 'hidden', border: '1.2px solid var(--ink)', marginBottom: 14 }}>
                      {AGING_BUCKETS.map(b => {
                        const pct = totalAging === 0 ? 0 : (data.aging[b.key].count / totalAging) * 100;
                        return pct > 0 ? (
                          <div
                            key={b.key}
                            style={{ width: `${pct}%`, background: b.color }}
                            title={`${b.label}: ${data.aging[b.key].count}`}
                          />
                        ) : null;
                      })}
                    </div>

                    {/* Bucket rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {AGING_BUCKETS.map(b => {
                        const bucket = data.aging[b.key];
                        return (
                          <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: b.color, flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>{b.sublabel}</div>
                              <div className="mono muted" style={{ fontSize: 10 }}>{b.label}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: b.color }}>{bucket.count}</div>
                              <div className="mono muted" style={{ fontSize: 9 }}>
                                {parseFloat(bucket.amount).toLocaleString('fr-FR')} DZD
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Overdue invoices table ── */}
            <div className="wf-box solid" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Factures en attente de paiement</span>
                {data.overdueCount > 0 && (
                  <span className="wf-pill bad" style={{ fontSize: 10 }}>{data.overdueCount} impayée{data.overdueCount > 1 ? 's' : ''}</span>
                )}
              </div>
              <table className="wf-table">
                <thead>
                  <tr>
                    {['Référence', 'Client', 'Montant', 'Émise le', 'Ancienneté', 'Gravité'].map(h => (
                      <th key={h} scope="col">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.overdueInvoices.map(inv => {
                    const bucket = inv.daysOld <= 30 ? AGING_BUCKETS[0]
                      : inv.daysOld <= 60 ? AGING_BUCKETS[1]
                      : inv.daysOld <= 90 ? AGING_BUCKETS[2]
                      : AGING_BUCKETS[3];
                    return (
                      <tr
                        key={inv.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                      >
                        <td className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
                          {inv.reference ?? '—'}
                        </td>
                        <td><b>{inv.clientName}</b></td>
                        <td style={{ fontWeight: 700 }}>
                          {parseFloat(inv.amount).toLocaleString('fr-FR')} DZD
                        </td>
                        <td className="mono" style={{ fontSize: 11 }}>
                          {new Date(inv.generatedAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="mono" style={{ fontSize: 12, fontWeight: 700, color: bucket.color }}>
                          {inv.daysOld} j
                        </td>
                        <td>
                          <span
                            className="wf-pill"
                            style={{ fontSize: 10, background: bucket.color, color: '#fff', border: 'none' }}
                          >
                            {bucket.sublabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {data.overdueInvoices.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                        ✓ Aucune facture en attente
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
