import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';

interface Invoice {
  id: string; missionId: string; clientName: string;
  amount: string; status: string; generatedAt: string; paidAt: string | null;
}
interface Payment {
  id: string; invoiceId: string; amount: string; paymentDate: string; method: string;
}

const STATUS_LABEL: Record<string, string> = { draft: 'Brouillon', sent: 'Envoyée', paid: 'Payée' };
const STATUS_PILL:  Record<string, string> = { draft: '',           sent: 'warn',    paid: 'good'  };
const METHOD_LABEL: Record<string, string> = {
  bank_transfer: 'Virement', cash: 'Espèces', card: 'Carte', check: 'Chèque',
};

const billingNav = [
  'FACTURATION',
  { key: 'inv',   icon: '🧾', label: 'Factures',     path: '/invoices' },
  { key: 'stats', icon: '📊', label: 'Statistiques', path: '/stats' },
  'PARAMÈTRES',
  { key: 'set',   icon: '⚙',  label: 'Paramètres' },
];

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [invoice, setInvoice]   = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError]       = useState('');
  const [payForm, setPayForm]   = useState({ amount: '', method: 'bank_transfer' });

  const loadPayments = useCallback(async () => {
    const r = await api.get(`/billing/payments?invoiceId=${id}`);
    setPayments(r.data.data ?? []);
  }, [id]);

  useEffect(() => {
    Promise.all([
      api.get(`/billing/invoices/${id}`),
      api.get(`/billing/payments?invoiceId=${id}`),
    ])
      .then(([invRes, payRes]) => {
        setInvoice(invRes.data.data);
        setPayments(payRes.data.data ?? []);
        setPayForm(prev => ({ ...prev, amount: invRes.data.data.amount }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function markStatus(status: string) {
    if (!invoice) return;
    setUpdating(true); setError('');
    try {
      const r = await api.patch(`/billing/invoices/${invoice.id}/status`, { status });
      setInvoice(r.data.data);
    } catch { setError('Impossible de mettre à jour le statut'); }
    finally { setUpdating(false); }
  }

  async function recordPayment() {
    if (!invoice) return;
    setRecording(true); setError('');
    try {
      await api.post('/billing/payments', {
        invoiceId: invoice.id,
        amount: parseFloat(payForm.amount),
        method: payForm.method,
      });
      await loadPayments();
      setPayForm(prev => ({ ...prev, amount: '' }));
    } catch { setError("Impossible d'enregistrer le paiement"); }
    finally { setRecording(false); }
  }

  const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount), 0);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="mono muted">Chargement…</span>
    </div>
  );
  if (!invoice) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="mono muted">Facture introuvable</span>
    </div>
  );

  const statusLabel = STATUS_LABEL[invoice.status] ?? invoice.status;
  const amount = parseFloat(invoice.amount);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="mono muted" style={{ cursor: 'pointer', fontSize: 11 }} onClick={() => navigate('/invoices')}>
              ← Factures
            </span>
            <span className="bar-crumbs">/ {invoice.clientName}</span>
          </div>
          <div className="bar-actions">
            <span className={`wf-pill ${STATUS_PILL[invoice.status]}`}>{statusLabel}</span>
            {invoice.status === 'draft' && (
              <button className="wf-btn warn sm" disabled={updating} onClick={() => markStatus('sent')}>
                {updating ? '…' : '📤 Envoyer'}
              </button>
            )}
            {invoice.status === 'sent' && (
              <button className="wf-btn good sm" disabled={updating} onClick={() => markStatus('paid')}>
                {updating ? '…' : '✓ Marquer payée'}
              </button>
            )}
          </div>
        </div>

        <div className="wf-shell-content" style={{ maxWidth: 860 }}>
          {error && <div className="wf-error" style={{ marginBottom: 14 }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
            {/* Left — invoice info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div className="script" style={{ fontSize: 28, lineHeight: 1 }}>{invoice.clientName}</div>
                <div className="mono muted" style={{ fontSize: 10.5, marginTop: 2 }}>
                  Facture {invoice.id.slice(0, 8)} · {statusLabel}
                </div>
              </div>

              {/* Info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="wf-box solid">
                  <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>Mission</div>
                  <div className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{invoice.missionId.slice(0, 8)}…</div>
                </div>
                <div className="wf-box solid">
                  <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>Montant</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-script)' }}>
                    {amount.toLocaleString('fr-FR')} DZD
                  </div>
                </div>
                <div className="wf-box solid">
                  <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>Générée le</div>
                  <div className="mono" style={{ fontSize: 12 }}>{new Date(invoice.generatedAt).toLocaleDateString('fr-FR')}</div>
                </div>
                <div className="wf-box solid">
                  <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>Payée le</div>
                  <div className="mono" style={{ fontSize: 12, color: invoice.paidAt ? 'var(--good)' : 'var(--ink-3)' }}>
                    {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString('fr-FR') : '—'}
                  </div>
                </div>
              </div>

              {/* Status timeline */}
              <div>
                <div className="mono muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                  Suivi
                </div>
                <div style={{ borderLeft: '2px dashed var(--ink)', paddingLeft: 12, marginLeft: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { label: 'Facture créée',   done: true },
                    { label: 'Envoyée au client', done: ['sent', 'paid'].includes(invoice.status) },
                    { label: 'Paiement reçu',   done: invoice.status === 'paid' },
                  ].map((step, i) => (
                    <div key={i} className="wf-row" style={{ padding: '6px 10px', gap: 8 }}>
                      <div className="wf-row-lead" style={{ width: 28, height: 28, fontSize: 13 }}>
                        {step.done ? '✓' : '○'}
                      </div>
                      <span style={{ fontSize: 13, color: step.done ? 'var(--ink)' : 'var(--ink-3)' }}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — payments */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Summary badge */}
              <div className="wf-box tint" style={{ textAlign: 'center', padding: '12px 8px' }}>
                <div className="mono muted" style={{ fontSize: 10, marginBottom: 4 }}>TOTAL ENCAISSÉ</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-script)', color: 'var(--good)' }}>
                  {totalPaid.toLocaleString('fr-FR')} DZD
                </div>
                <div className="mono muted" style={{ fontSize: 10, marginTop: 2 }}>
                  sur {amount.toLocaleString('fr-FR')} DZD
                </div>
                {/* Remaining bar */}
                <div style={{ height: 5, background: 'var(--paper-2)', borderRadius: 3, overflow: 'hidden', marginTop: 8, border: '1px solid var(--ink-3)' }}>
                  <div style={{
                    width: `${Math.min(100, (totalPaid / amount) * 100)}%`,
                    height: '100%', background: 'var(--good)', borderRadius: 3,
                  }} />
                </div>
              </div>

              {/* Record payment form */}
              {invoice.status !== 'paid' && (
                <div className="wf-box solid">
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Enregistrer un paiement</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <label className="mono muted" style={{ fontSize: 10, display: 'block', marginBottom: 3 }}>Montant (DZD)</label>
                      <input
                        type="number"
                        className="wf-inp"
                        style={{ width: '100%' }}
                        value={payForm.amount}
                        onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="mono muted" style={{ fontSize: 10, display: 'block', marginBottom: 3 }}>Mode de paiement</label>
                      <select
                        className="wf-inp"
                        style={{ width: '100%' }}
                        value={payForm.method}
                        onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))}
                      >
                        <option value="bank_transfer">Virement bancaire</option>
                        <option value="cash">Espèces</option>
                        <option value="card">Carte bancaire</option>
                        <option value="check">Chèque</option>
                      </select>
                    </div>
                    <button
                      className="wf-btn good"
                      disabled={recording || !payForm.amount}
                      onClick={recordPayment}
                      style={{ width: '100%', marginTop: 4 }}
                    >
                      {recording ? 'Enregistrement…' : '✓ Enregistrer'}
                    </button>
                  </div>
                </div>
              )}

              {/* Payment history */}
              <div>
                <div className="mono muted" style={{ fontSize: 10, textTransform: 'uppercase', marginBottom: 6 }}>
                  Historique des paiements
                </div>
                {payments.length === 0 ? (
                  <div className="wf-box tint" style={{ textAlign: 'center', padding: '16px 0' }}>
                    <span className="mono muted" style={{ fontSize: 11 }}>Aucun paiement enregistré</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {payments.map(p => (
                      <div key={p.id} className="wf-row" style={{ gap: 8 }}>
                        <div className="wf-row-lead" style={{ fontSize: 13 }}>💳</div>
                        <div className="wf-row-main">
                          <b>{parseFloat(p.amount).toLocaleString('fr-FR')} DZD</b>
                          <small>{METHOD_LABEL[p.method] ?? p.method}</small>
                        </div>
                        <span className="mono muted" style={{ fontSize: 10, flexShrink: 0 }}>
                          {new Date(p.paymentDate).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
