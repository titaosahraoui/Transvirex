import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../context/AuthContext';

export default function NewMissionPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    clientName: '', pickupAddress: '', deliveryAddress: '', deadline: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const r = await api.post('/missions', {
        clientName:      form.clientName,
        pickupAddress:   form.pickupAddress,
        deliveryAddress: form.deliveryAddress,
        deadline:        form.deadline || undefined,
      });
      navigate(`/missions/${r.data.data.id}`);
    } catch {
      setError('Failed to create mission. Please check your input.');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/board')} className="text-gray-400 hover:text-gray-700">← Back</button>
        <h1 className="font-bold text-xl text-gray-800">New Mission</h1>
      </header>

      <div className="max-w-xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2">{error}</div>}

          {[
            { label: 'Client Name',       field: 'clientName',      type: 'text',     placeholder: 'Acme Corp' },
            { label: 'Pickup Address',    field: 'pickupAddress',   type: 'text',     placeholder: '10 Rue de la Paix, Algiers' },
            { label: 'Delivery Address',  field: 'deliveryAddress', type: 'text',     placeholder: '20 Boulevard Victor Hugo, Oran' },
            { label: 'Deadline (optional)', field: 'deadline',      type: 'datetime-local', placeholder: '' },
          ].map(({ label, field, type, placeholder }) => (
            <div key={field}>
              <label className="block text-sm text-gray-600 mb-1">{label}</label>
              <input
                type={type}
                value={(form as any)[field]}
                onChange={e => set(field, e.target.value)}
                required={field !== 'deadline'}
                placeholder={placeholder}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate('/board')}
              className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 transition-colors">
              {loading ? 'Creating…' : 'Create Mission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
