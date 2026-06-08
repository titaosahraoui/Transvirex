import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';

interface Invoice {
  id: string; missionId: string; clientName: string;
  amount: string; status: string; generatedAt: string; paidAt: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyée', paid: 'Payée',
};
const STATUS_PILL: Record<string, string> = {
  draft: '', sent: 'warn', paid: 'good',
};

const billingNav = [
  'FACTURATION',
  { key: 'inv',   icon: '🧾', label: 'Factures',     path: '/invoices' },
  { key: 'stats', icon: '📊', label: 'Statistiques', path: '/stats' },
  'PARAMÈTRES',
  { key: 'set',   icon: '⚙',  label: 'Paramètres' },
];

export default function InvoicesPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter]     = useState('all');
  const [loading, setLoading]   = useState(true);
  const [showNew, setShowNew]   = useState(false);
  const [newForm, setNewForm]   = useState({ missionId: '', clientName: '', amount: '' });
  const [creating, setCreating] = useState(false);
  const [fetching, setFetching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === 'all' ? '/billing/invoices' : `/billing/invoices?status=${filter}`;
      const r = await api.get(url);
      setInvoices(r.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (newForm.missionId.length < 8) return;
    const t = setTimeout(async () => {
      setFetching(true);
      try {
        const r = await api.get(`/missions/${newForm.missionId}`);
        const m = r.data.data;
        setNewForm(prev => ({
          ...prev,
          clientName: m.clientName,
          amount: String(parseFloat(m.price) || ''),
        }));
      } catch { /* silent — user may still be typing */ }
      finally { setFetching(false); }
    }, 600);
    return () => clearTimeout(t);
  }, [newForm.missionId]);

  async function createInvoice() {
    setCreating(true);
    try {
      await api.post('/billing/invoices', {
        missionId: newForm.missionId,
        clientName: newForm.clientName,
        amount: parseFloat(newForm.amount),
      });
      setShowNew(false);
      setNewForm({ missionId: '', clientName: '', amount: '' });
      load();
    } catch { console.error('Impossible de créer la facture'); }
    finally { setCreating(false); }
  }

  async function markStatus(id: string, status: string) {
    try {
      await api.patch(`/billing/invoices/${id}/status`, { status });
      load();
    } catch { console.error(`Impossible de passer à : ${status}`); }
  }

  const total = invoices.reduce((s, inv) => s + parseFloat(inv.amount), 0);
  const paidTotal = invoices.filter(i => i.status === 'paid').reduce((s, inv) => s + parseFloat(inv.amount), 0);

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
              className={`side-nav ${item.key === 'inv' ? 'on' : ''}`}
              onClick={() => 'path' in item && item.path && navigate(item.path)}
            >
              <span className="ic">{item.icon}</span> {item.label}
              {item.key === 'inv' && <span className="side-tag">{invoices.length}</span>}
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
          <span className="bar-crumbs">Facturation / Factures</span>
          <div className="bar-actions">
            {/* Filter pills */}
            {['all', 'draft', 'sent', 'paid'].map(f => (
              <span
                key={f}
                className={`wf-pill${filter === f ? ' fill' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Toutes' : STATUS_LABEL[f]}
              </span>
            ))}
            <button className="wf-btn fill" onClick={() => setShowNew(true)}>＋ Nouvelle facture</button>
          </div>
        </div>

        <div className="wf-shell-content">
          {/* KPI summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            <div className="wf-kpi">
              <div className="mono muted" style={{ fontSize: 10, marginBottom: 4 }}>TOTAL FACTURÉ</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-script)' }}>
                {total.toLocaleString('fr-FR')} DZD
              </div>
            </div>
            <div className="wf-kpi">
              <div className="mono muted" style={{ fontSize: 10, marginBottom: 4 }}>ENCAISSÉ</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-script)', color: 'var(--good)' }}>
                {paidTotal.toLocaleString('fr-FR')} DZD
              </div>
            </div>
            <div className="wf-kpi">
              <div className="mono muted" style={{ fontSize: 10, marginBottom: 4 }}>EN ATTENTE</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-script)', color: 'var(--accent)' }}>
                {(total - paidTotal).toLocaleString('fr-FR')} DZD
              </div>
            </div>
          </div>

          {/* Modal: nouvelle facture */}
          {showNew && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(31,29,26,.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20,
            }}>
              <div className="wf-box solid" style={{ width: '100%', maxWidth: 440, padding: '20px 22px' }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
                  <span className="script">Générer une facture</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label className="wf-field-label">ID Mission *</label>
                      {fetching && <span className="mono muted" style={{ fontSize: 10 }}>Chargement…</span>}
                    </div>
                    <input
                      type="text"
                      value={newForm.missionId}
                      onChange={e => setNewForm(p => ({ ...p, missionId: e.target.value }))}
                      className="wf-inp box" style={{ width: '100%', marginTop: 4 }}
                      placeholder="ID de la mission (8 caractères min.)"
                    />
                  </div>
                  {[
                    { label: 'Nom client',    field: 'clientName', type: 'text'   },
                    { label: 'Montant (DZD)', field: 'amount',     type: 'number' },
                  ].map(({ label, field, type }) => (
                    <div key={field}>
                      <label className="wf-field-label">{label}</label>
                      <input
                        type={type}
                        value={(newForm as any)[field]}
                        onChange={e => setNewForm(p => ({ ...p, [field]: e.target.value }))}
                        className="wf-inp box" style={{ width: '100%', marginTop: 4 }}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                    <button className="wf-btn" onClick={() => setShowNew(false)}>Annuler</button>
                    <button className="wf-btn fill" disabled={creating} onClick={createInvoice}>
                      {creating ? 'Création…' : 'Créer'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invoices table */}
          {loading ? (
            <div className="mono muted" style={{ textAlign: 'center', padding: '40px 0', fontSize: 12 }}>Chargement…</div>
          ) : (
            <div className="wf-box solid" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="wf-table">
                <thead>
                  <tr>
                    {['Client', 'Mission', 'Montant', 'Statut', 'Générée le', 'Actions'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <td><b>{inv.clientName}</b></td>
                      <td className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                        {inv.missionId.slice(0, 8)}…
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {parseFloat(inv.amount).toLocaleString('fr-FR')} DZD
                      </td>
                      <td>
                        <span className={`wf-pill ${STATUS_PILL[inv.status] ?? ''}`} style={{ fontSize: 10 }}>
                          {STATUS_LABEL[inv.status] ?? inv.status}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: 11 }}>
                        {new Date(inv.generatedAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        {inv.status === 'draft' && (
                          <button className="wf-btn sm warn" onClick={() => markStatus(inv.id, 'sent')}>
                            Envoyer
                          </button>
                        )}
                        {inv.status === 'sent' && (
                          <button className="wf-btn sm good" onClick={() => markStatus(inv.id, 'paid')}>
                            Marquer payée
                          </button>
                        )}
                        {inv.status === 'paid' && (
                          <span className="mono muted" style={{ fontSize: 10 }}>
                            {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('fr-FR') : '✓'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                        — Aucune facture —
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
