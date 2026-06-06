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
      setError('Impossible de créer la mission. Vérifiez les informations saisies.');
    } finally { setLoading(false); }
  }

  const fields = [
    { label: 'Client',            field: 'clientName',      type: 'text',           ph: 'Mme Lefèvre',               req: true  },
    { label: 'Adresse de pickup', field: 'pickupAddress',   type: 'text',           ph: 'Hub Paris-Est · 12 av. République', req: true  },
    { label: 'Adresse de livraison', field: 'deliveryAddress', type: 'text',        ph: '14 rue Daguerre, 75014 Paris', req: true },
    { label: 'Délai',             field: 'deadline',        type: 'datetime-local', ph: '',                           req: false },
  ] as const;

  return (
    <div className="wf-shell">
      {/* Sidebar */}
      <aside className="wf-side">
        <div className="side-logo">transvirex</div>
        <div className="side-group">OPÉRATIONS</div>
        <div className="side-nav" onClick={() => navigate('/board')}>
          <span className="ic">📋</span> Missions
        </div>
        <div className="side-nav on">
          <span className="ic">＋</span> Nouvelle mission
        </div>
      </aside>

      <div className="wf-shell-main">
        <div className="wf-appbar">
          <span className="bar-crumbs">Missions / + Nouvelle mission</span>
          <div className="bar-actions">
            <button className="wf-btn" onClick={() => navigate('/board')}>← Annuler</button>
          </div>
        </div>

        <div className="wf-shell-content" style={{ maxWidth: 680 }}>
          <div className="script" style={{ fontSize: 30, marginBottom: 4 }}>Créer une mission</div>
          <div className="mono muted" style={{ fontSize: 11, marginBottom: 18 }}>Remplissez les informations de la nouvelle course.</div>

          {/* Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
            <span style={{ background: 'var(--ink)', color: '#fff', borderRadius: 99, padding: '1px 7px' }}>1</span>
            <span>Trajet & client</span>
            <span style={{ flex: 1, height: 0, borderTop: '1.4px dashed var(--ink-3)' }} />
            <span style={{ background: '#fff', border: '1.4px solid var(--ink-3)', borderRadius: 99, padding: '0 7px' }}>2</span>
            <span>Colis</span>
            <span style={{ flex: 1, height: 0, borderTop: '1.4px dashed var(--ink-3)' }} />
            <span style={{ background: '#fff', border: '1.4px solid var(--ink-3)', borderRadius: 99, padding: '0 7px' }}>3</span>
            <span>Assignation</span>
          </div>

          {error && <div className="wf-error" style={{ marginBottom: 14 }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {fields.slice(0, 2).map(({ label, field, type, ph, req }) => (
                <div key={field} className="wf-box solid" style={{ padding: '12px 14px' }}>
                  <label className="wf-field-label">{label}{!req && ' (optionnel)'}</label>
                  <input
                    type={type} value={(form as any)[field]}
                    onChange={e => set(field, e.target.value)}
                    required={req} placeholder={ph}
                    className="wf-inp" style={{ marginTop: 6 }}
                  />
                </div>
              ))}
            </div>

            <div className="wf-box solid" style={{ padding: '12px 14px' }}>
              <label className="wf-field-label">Adresse de livraison</label>
              <input
                type="text" value={form.deliveryAddress}
                onChange={e => set('deliveryAddress', e.target.value)}
                required placeholder="14 rue Daguerre, 75014 Paris"
                className="wf-inp" style={{ marginTop: 6 }}
              />
            </div>

            <div className="wf-box" style={{ padding: '12px 14px' }}>
              <label className="wf-field-label">Créneau de livraison</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <span className="wf-pill warn">ASAP</span>
                <span className="wf-pill">≤ 2h</span>
                <span className="wf-pill">Aujourd'hui</span>
                <span className="wf-pill">Demain</span>
              </div>
              <div style={{ marginTop: 10 }}>
                <label className="wf-field-label">Délai précis (optionnel)</label>
                <input
                  type="datetime-local" value={form.deadline}
                  onChange={e => set('deadline', e.target.value)}
                  className="wf-inp box" style={{ marginTop: 4 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button type="button" className="wf-btn" onClick={() => navigate('/board')}>← Annuler</button>
              <button type="submit" disabled={loading} className="wf-btn fill">
                {loading ? 'Création…' : 'Créer la mission →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
