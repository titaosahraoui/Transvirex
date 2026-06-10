import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';

interface MissionStats {
  pendingCount: number; assignedCount: number; inProgressCount: number;
  completedCount: number; failedCount: number; cancelledCount: number;
  overdueCount: number; slaPercent: number; totalRevenue: string;
}
interface BillingSla {
  slaRate: number; paidCount: number; paidOnTimeCount: number;
  overdueCount: number; overdueAmount: string; avgDaysToPay: number;
  aging: {
    '0_30': { count: number; amount: string };
    '31_60': { count: number; amount: string };
    '61_90': { count: number; amount: string };
    '90plus': { count: number; amount: string };
  };
}

const mgmtNav = [
  'PERFORMANCE',
  { key: 'dash', icon: '📊', label: 'Tableau de bord', path: '/dashboard' },
  { key: 'sla',  icon: '⏱',  label: 'SLA & délais',   path: '/sla' },
  'FLOTTE',
  { key: 'drv',  icon: '🚐', label: 'Chauffeurs', path: '/drivers' },
  { key: 'geo',  icon: '🗺',  label: 'Géographie', path: '/geo' },
  'ADMINISTRATION',
  { key: 'team', icon: '👥', label: 'Équipe',      path: '/team' },
];

const AGING_BUCKETS = [
  { key: '0_30'   as const, label: '0 – 30 j',  sublabel: 'Récentes',    color: 'var(--hi)'   },
  { key: '31_60'  as const, label: '31 – 60 j', sublabel: 'En retard',   color: '#f97316'     },
  { key: '61_90'  as const, label: '61 – 90 j', sublabel: 'Critique',    color: 'var(--bad)'  },
  { key: '90plus' as const, label: '90+ j',     sublabel: 'Contentieux', color: '#7f1d1d'     },
];

function SlaRing({ rate, subtitle }: { rate: number; subtitle: string }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - rate / 100);
  const color = rate >= 80 ? 'var(--good)' : rate >= 60 ? 'var(--hi)' : 'var(--bad)';
  return (
    <svg viewBox="0 0 100 100" width={130} height={130} aria-label={`SLA ${rate}%`}>
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
      <text x="50" y="60" textAnchor="middle" fontSize="7.5" fontFamily="var(--font-mono)" fill="var(--ink-3)">
        {subtitle}
      </text>
    </svg>
  );
}

function toRate(from: number, to: number) {
  return from === 0 ? '—' : `${Math.round((to / from) * 100)}%`;
}

export default function SLAPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mStats, setMStats] = useState<MissionStats | null>(null);
  const [bSla,   setBSla]   = useState<BillingSla | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/missions/stats'),
      api.get('/billing/sla'),
    ])
      .then(([mRes, bRes]) => {
        setMStats(mRes.data.data);
        setBSla(bRes.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const mTotal = mStats
    ? mStats.pendingCount + mStats.assignedCount + mStats.inProgressCount +
      mStats.completedCount + mStats.failedCount + mStats.cancelledCount
    : 0;
  const mAssigned    = mStats ? mStats.assignedCount + mStats.inProgressCount + mStats.completedCount + mStats.failedCount : 0;
  const mInProgress  = mStats ? mStats.inProgressCount + mStats.completedCount + mStats.failedCount : 0;
  const mCompleted   = mStats?.completedCount ?? 0;

  const totalAging = bSla
    ? AGING_BUCKETS.reduce((s, b) => s + bSla.aging[b.key].count, 0)
    : 0;

  return (
    <div className="wf-shell">
      <aside className="wf-side">
        <div className="side-logo">transvirex</div>
        <div className="side-role">Direction · {user?.name}</div>
        {mgmtNav.map((item, i) => {
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
          <span className="bar-crumbs">Direction / SLA & Délais</span>
        </div>

        {loading ? (
          <div className="mono muted" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Chargement…
          </div>
        ) : (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 960 }}>

            {/* ── KPI row ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                {
                  label: 'SLA Missions',
                  value: `${mStats?.slaPercent ?? 100}%`,
                  sub: 'livrées dans les délais',
                  color: (mStats?.slaPercent ?? 100) >= 80 ? 'var(--good)' : (mStats?.slaPercent ?? 100) >= 60 ? 'var(--hi)' : 'var(--bad)',
                },
                {
                  label: 'Missions en retard',
                  value: String(mStats?.overdueCount ?? 0),
                  sub: 'actives passé deadline',
                  color: (mStats?.overdueCount ?? 0) > 0 ? 'var(--bad)' : 'var(--good)',
                },
                {
                  label: 'SLA Facturation',
                  value: `${bSla?.slaRate ?? 100}%`,
                  sub: `${bSla?.paidOnTimeCount ?? 0} / ${bSla?.paidCount ?? 0} factures`,
                  color: (bSla?.slaRate ?? 100) >= 80 ? 'var(--good)' : (bSla?.slaRate ?? 100) >= 60 ? 'var(--hi)' : 'var(--bad)',
                },
                {
                  label: 'Impayés',
                  value: bSla ? `${parseFloat(bSla.overdueAmount).toLocaleString('fr-FR')}` : '—',
                  sub: 'DZD en attente',
                  color: (bSla?.overdueCount ?? 0) > 0 ? 'var(--accent)' : 'var(--good)',
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

            {/* ── Mission SLA ring + funnel ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: 12 }}>
              <div className="wf-box solid" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px', gap: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 13, alignSelf: 'flex-start' }}>Conformité missions</div>
                <SlaRing rate={mStats?.slaPercent ?? 100} subtitle="livrées dans délais" />
                <div style={{ textAlign: 'center' }}>
                  <div className="mono muted" style={{ fontSize: 10 }}>Missions livrées avant la deadline</div>
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

              <div className="wf-box solid" style={{ padding: '16px 18px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Entonnoir des missions</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  {[
                    { label: 'Créées',    value: mTotal,      color: 'var(--ink)'    },
                    { label: 'Assignées', value: mAssigned,   color: 'var(--hi)'     },
                    { label: 'En route',  value: mInProgress, color: 'var(--accent)' },
                    { label: 'Livrées',   value: mCompleted,  color: 'var(--good)'   },
                  ].map((stage, i, arr) => (
                    <>
                      <div key={stage.label} style={{ textAlign: 'center', padding: '10px 12px' }}>
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
                {/* Status pills row */}
                <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { label: `${mStats?.pendingCount ?? 0} en attente`,   color: '' },
                    { label: `${mStats?.failedCount ?? 0} échecs`,        color: 'bad' },
                    { label: `${mStats?.cancelledCount ?? 0} annulées`,   color: '' },
                  ].map(p => (
                    <span key={p.label} className={`wf-pill ${p.color}`} style={{ fontSize: 10 }}>{p.label}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Billing SLA ring + aging ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 12 }}>
              <div className="wf-box solid" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px', gap: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 13, alignSelf: 'flex-start' }}>Conformité facturation</div>
                <SlaRing rate={bSla?.slaRate ?? 100} subtitle="payé ≤ 30 j" />
                <div className="mono muted" style={{ fontSize: 10, textAlign: 'center' }}>
                  Factures payées dans les 30 jours
                </div>
              </div>

              <div className="wf-box solid" style={{ padding: '16px 18px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Ancienneté des impayés</div>

                {totalAging === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <div style={{ fontSize: 24 }}>✓</div>
                    <div className="mono muted" style={{ fontSize: 11, marginTop: 6 }}>Aucune facture en attente</div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', height: 20, borderRadius: 4, overflow: 'hidden', border: '1.2px solid var(--ink)', marginBottom: 14 }}>
                      {AGING_BUCKETS.map(b => {
                        const pct = bSla ? (bSla.aging[b.key].count / totalAging) * 100 : 0;
                        return pct > 0 ? (
                          <div
                            key={b.key}
                            style={{ width: `${pct}%`, background: b.color }}
                            title={`${b.label}: ${bSla?.aging[b.key].count}`}
                          />
                        ) : null;
                      })}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {AGING_BUCKETS.map(b => {
                        const bucket = bSla?.aging[b.key] ?? { count: 0, amount: '0' };
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

          </div>
        )}
      </main>
    </div>
  );
}
