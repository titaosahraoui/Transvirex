import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

interface Invoice {
  id: string; reference?: string; missionId: string; clientName: string;
  amount: string; status: string; generatedAt: string; paidAt: string | null;
}

function validateInvoiceForm(form: { missionId: string; clientName: string; amount: string }): string[] {
  const errors: string[] = [];
  if (!form.missionId.trim()) errors.push('L\'ID Mission est requis.');
  else if (form.missionId.trim().length < 8) errors.push('L\'ID Mission doit contenir au moins 8 caractères.');
  if (!form.clientName.trim()) errors.push('Le nom du client est requis.');
  else if (form.clientName.trim().length < 2) errors.push('Le nom du client doit contenir au moins 2 caractères.');
  if (!form.amount) errors.push('Le montant est requis.');
  else if (isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0)
    errors.push('Le montant doit être un nombre positif.');
  return errors;
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
  { key: 'sla',   icon: '⏱',  label: 'SLA & Délais', path: '/sla' },
  'PARAMÈTRES',
  { key: 'set',   icon: '⚙',  label: 'Paramètres' },
];

export default function InvoicesPage() {
  const { user, logout } = useAuth();
  const { socket } = useNotification();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter]     = useState('all');
  const [loading, setLoading]   = useState(true);
  const [showNew, setShowNew]     = useState(false);
  const [newForm, setNewForm]     = useState({ missionId: '', clientName: '', amount: '' });
  const [creating, setCreating]   = useState(false);
  const [fetching, setFetching]   = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [touched, setTouched]     = useState(false);

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

  // Socket-driven list refresh
  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    socket.on('invoice:paid', refresh);
    socket.on('payment:recorded', refresh);
    return () => { socket.off('invoice:paid', refresh); socket.off('payment:recorded', refresh); };
  }, [socket, load]);

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
    setTouched(true);
    const errors = validateInvoiceForm(newForm);
    setFormErrors(errors);
    if (errors.length > 0) return;

    setCreating(true);
    try {
      await api.post('/billing/invoices', {
        missionId: newForm.missionId,
        clientName: newForm.clientName,
        amount: parseFloat(newForm.amount),
      });
      setShowNew(false);
      setNewForm({ missionId: '', clientName: '', amount: '' });
      setFormErrors([]);
      setTouched(false);
      load();
    } catch { console.error('Impossible de créer la facture'); }
    finally { setCreating(false); }
  }

  function closeNewForm() {
    setShowNew(false);
    setNewForm({ missionId: '', clientName: '', amount: '' });
    setFormErrors([]);
    setTouched(false);
  }

  function handleFormChange(field: string, value: string) {
    const next = { ...newForm, [field]: value };
    setNewForm(next as any);
    if (touched) setFormErrors(validateInvoiceForm(next as any));
  }

  async function markStatus(id: string, status: string) {
    try {
      await api.patch(`/billing/invoices/${id}/status`, { status });
      load();
    } catch { console.error(`Impossible de passer à : ${status}`); }
  }

  async function downloadPdf(invoiceId: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const response = await api.get(`/billing/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-${invoiceId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { console.error('PDF download failed'); }
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
      <main className="wf-shell-main">
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
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="new-invoice-title"
              style={{
                position: 'fixed', inset: 0, background: 'rgba(31,29,26,.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20,
              }}
            >
              <div className="wf-box solid" style={{ width: '100%', maxWidth: 440, padding: '20px 22px' }}>
                <div id="new-invoice-title" style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
                  <span className="script">Générer une facture</span>
                </div>

                {/* Validation errors — all shown at once */}
                {formErrors.length > 0 && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    style={{
                      background: '#ffeaea', border: '1px solid var(--bad)', borderRadius: 6,
                      padding: '10px 12px', marginBottom: 14,
                    }}
                  >
                    <div className="mono" style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: 'var(--bad)' }}>
                      Veuillez corriger les erreurs suivantes :
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {formErrors.map((e, i) => (
                        <li key={i} style={{ fontSize: 12, color: 'var(--bad)', lineHeight: 1.6 }}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label htmlFor="inv-missionId" className="wf-field-label">ID Mission *</label>
                      {fetching && <span className="mono muted" style={{ fontSize: 10 }}>Chargement…</span>}
                    </div>
                    <input
                      id="inv-missionId"
                      type="text"
                      value={newForm.missionId}
                      onChange={e => handleFormChange('missionId', e.target.value)}
                      className="wf-inp box"
                      style={{ width: '100%', marginTop: 4, borderColor: touched && !newForm.missionId ? 'var(--bad)' : undefined }}
                      placeholder="ID de la mission (8 caractères min.)"
                      aria-required="true"
                      aria-describedby={formErrors.length > 0 ? 'form-errors' : undefined}
                    />
                  </div>
                  {[
                    { label: 'Nom client *',   id: 'inv-clientName', field: 'clientName', type: 'text'   },
                    { label: 'Montant (DZD) *', id: 'inv-amount',    field: 'amount',     type: 'number' },
                  ].map(({ label, id, field, type }) => (
                    <div key={field}>
                      <label htmlFor={id} className="wf-field-label">{label}</label>
                      <input
                        id={id}
                        type={type}
                        value={(newForm as any)[field]}
                        onChange={e => handleFormChange(field, e.target.value)}
                        className="wf-inp box"
                        style={{ width: '100%', marginTop: 4 }}
                        aria-required="true"
                        min={type === 'number' ? '0.01' : undefined}
                        step={type === 'number' ? '0.01' : undefined}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                    <button className="wf-btn" onClick={closeNewForm}>Annuler</button>
                    <button
                      className="wf-btn fill"
                      disabled={creating}
                      onClick={createInvoice}
                      aria-busy={creating}
                    >
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
                    {['Référence', 'Client', 'Mission', 'Montant', 'Statut', 'Générée le', 'Actions'].map(h => (
                      <th key={h} scope="col">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <td className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                        {inv.reference ?? '—'}
                      </td>
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
                      <td onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
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
                        <button className="wf-btn sm" title="Télécharger PDF" onClick={e => downloadPdf(inv.id, e)}>
                          ⬇
                        </button>
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                        — Aucune facture —
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
