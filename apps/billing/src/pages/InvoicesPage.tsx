import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';

interface Invoice {
  id: string; missionId: string; clientName: string;
  amount: string; status: string; generatedAt: string; paidAt: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent:  'bg-blue-100 text-blue-700',
  paid:  'bg-green-100 text-green-700',
};

export default function InvoicesPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter]     = useState('all');
  const [loading, setLoading]   = useState(true);
  const [showNew, setShowNew]   = useState(false);
  const [newForm, setNewForm]   = useState({ missionId: '', clientName: '', amount: '' });
  const [creating, setCreating] = useState(false);

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
    } catch { alert('Failed to create invoice'); }
    finally { setCreating(false); }
  }

  async function markStatus(id: string, status: string) {
    try {
      await api.patch(`/billing/invoices/${id}/status`, { status });
      load();
    } catch { alert(`Cannot transition to ${status}`); }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl text-gray-800">Invoices</h1>
          <p className="text-sm text-gray-500">{user?.name}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowNew(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + Generate Invoice
          </button>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-700">Sign out</button>
        </div>
      </header>

      {/* Filter */}
      <div className="flex gap-2 px-6 py-3 bg-white border-b">
        {['all', 'draft', 'sent', 'paid'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors capitalize
              ${filter === f ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* New invoice modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-bold text-lg text-gray-800">Generate Invoice</h2>
            {[
              { label: 'Mission ID', field: 'missionId', type: 'text' },
              { label: 'Client Name', field: 'clientName', type: 'text' },
              { label: 'Amount (DZD)', field: 'amount', type: 'number' },
            ].map(({ label, field, type }) => (
              <div key={field}>
                <label className="block text-sm text-gray-600 mb-1">{label}</label>
                <input type={type} value={(newForm as any)[field]}
                  onChange={e => setNewForm(p => ({ ...p, [field]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={() => setShowNew(false)}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={createInvoice} disabled={creating}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg py-2 font-medium">
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="p-6">
        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading…</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Client', 'Mission ID', 'Amount', 'Status', 'Generated', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{inv.clientName}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{inv.missionId.slice(0, 8)}…</td>
                    <td className="px-4 py-3 font-semibold">{parseFloat(inv.amount).toLocaleString()} DZD</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[inv.status]}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(inv.generatedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 flex gap-2">
                      {inv.status === 'draft' && (
                        <button onClick={() => markStatus(inv.id, 'sent')}
                          className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded transition-colors">
                          Mark Sent
                        </button>
                      )}
                      {inv.status === 'sent' && (
                        <button onClick={() => markStatus(inv.id, 'paid')}
                          className="text-xs bg-green-50 text-green-600 hover:bg-green-100 px-2 py-1 rounded transition-colors">
                          Mark Paid
                        </button>
                      )}
                      {inv.status === 'paid' && (
                        <span className="text-xs text-gray-400">
                          {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : 'Paid'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-12">No invoices found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
