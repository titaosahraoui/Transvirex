import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';

interface TeamUser {
  id: string; email: string; name: string; phone: string | null;
  role: string; createdAt: string;
}

const ROLE_LABEL: Record<string, string> = {
  dispatcher: 'Dispatcher', billing: 'Facturation',
  management: 'Direction',  driver:  'Chauffeur',
};
const ROLE_PILL: Record<string, string> = {
  dispatcher: 'warn', billing: '', management: 'good', driver: '',
};

const mgmtNav = [
  'PERFORMANCE',
  { key: 'dash', icon: '📊', label: 'Tableau de bord', path: '/dashboard' },
  { key: 'sla',  icon: '⏱',  label: 'SLA & délais',   path: '/sla' },
  'FLOTTE',
  { key: 'drv',  icon: '🚐', label: 'Chauffeurs',      path: '/drivers' },
  { key: 'geo',  icon: '🗺',  label: 'Géographie',     path: '/geo' },
  'ADMINISTRATION',
  { key: 'team', icon: '👥', label: 'Équipe',           path: '/team' },
];

function validateForm(form: { name: string; email: string; password: string; role: string }): string[] {
  const errors: string[] = [];
  if (!form.name.trim() || form.name.trim().length < 2) errors.push('Le nom doit contenir au moins 2 caractères.');
  if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.push('Adresse email invalide.');
  if (!form.password || form.password.length < 6) errors.push('Le mot de passe doit contenir au moins 6 caractères.');
  if (!form.role) errors.push('Le rôle est requis.');
  return errors;
}

export default function TeamPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers]       = useState<TeamUser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [showNew, setShowNew]   = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [touched, setTouched]   = useState(false);
  const [newForm, setNewForm]   = useState({ name: '', email: '', password: '', role: 'dispatcher', phone: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === 'all' ? '/auth/users' : `/auth/users?role=${filter}`;
      const r = await api.get(url);
      setUsers(r.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  function handleFormChange(field: string, value: string) {
    const next = { ...newForm, [field]: value };
    setNewForm(next);
    if (touched) setFormErrors(validateForm(next));
  }

  async function createUser() {
    setTouched(true);
    const errors = validateForm(newForm);
    setFormErrors(errors);
    if (errors.length > 0) return;

    setCreating(true);
    try {
      await api.post('/auth/users', {
        name: newForm.name,
        email: newForm.email,
        password: newForm.password,
        role: newForm.role,
        phone: newForm.phone || undefined,
      });
      setShowNew(false);
      setNewForm({ name: '', email: '', password: '', role: 'dispatcher', phone: '' });
      setFormErrors([]);
      setTouched(false);
      load();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Impossible de créer le membre.';
      setFormErrors([msg]);
    } finally { setCreating(false); }
  }

  function closeForm() {
    setShowNew(false);
    setNewForm({ name: '', email: '', password: '', role: 'dispatcher', phone: '' });
    setFormErrors([]);
    setTouched(false);
  }

  async function deleteUser(id: string, name: string) {
    if (!window.confirm(`Supprimer le compte de ${name} ? Cette action est irréversible.`)) return;
    setDeleting(id);
    try {
      await api.delete(`/auth/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch { console.error('Failed to delete user'); }
    finally { setDeleting(null); }
  }

  const counts = {
    dispatcher: users.filter(u => u.role === 'dispatcher').length,
    billing:    users.filter(u => u.role === 'billing').length,
    management: users.filter(u => u.role === 'management').length,
    driver:     users.filter(u => u.role === 'driver').length,
  };

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
              className={`side-nav ${item.key === 'team' ? 'on' : ''}`}
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
          <span className="bar-crumbs">Direction / Équipe</span>
          <div className="bar-actions">
            {['all', 'dispatcher', 'billing', 'management', 'driver'].map(f => (
              <span
                key={f}
                className={`wf-pill${filter === f ? ' fill' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Tous' : ROLE_LABEL[f]}
              </span>
            ))}
            <button className="wf-btn fill" onClick={() => setShowNew(true)}>＋ Ajouter</button>
          </div>
        </div>

        <div className="wf-shell-content">
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Total membres',   value: users.length,       color: 'var(--ink)'    },
              { label: 'Dispatchers',     value: counts.dispatcher,  color: 'var(--accent)' },
              { label: 'Facturation',     value: counts.billing,     color: 'var(--hi)'     },
              { label: 'Direction',       value: counts.management,  color: 'var(--good)'   },
            ].map(k => (
              <div key={k.label} className="wf-kpi" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-script)', color: k.color }}>{k.value}</div>
                <div className="mono muted" style={{ fontSize: 10, marginTop: 4 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Modal */}
          {showNew && (
            <div
              role="dialog" aria-modal="true" aria-labelledby="new-user-title"
              style={{
                position: 'fixed', inset: 0, background: 'rgba(31,29,26,.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20,
              }}
            >
              <div className="wf-box solid" style={{ width: '100%', maxWidth: 420, padding: '20px 22px' }}>
                <div id="new-user-title" style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
                  <span className="script">Ajouter un membre</span>
                </div>

                {formErrors.length > 0 && (
                  <div
                    role="alert" aria-live="assertive"
                    style={{ background: '#ffeaea', border: '1px solid var(--bad)', borderRadius: 6, padding: '10px 12px', marginBottom: 14 }}
                  >
                    <div className="mono" style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: 'var(--bad)' }}>
                      Veuillez corriger les erreurs :
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {formErrors.map((e, i) => (
                        <li key={i} style={{ fontSize: 12, color: 'var(--bad)', lineHeight: 1.6 }}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Nom *',          id: 'u-name',  field: 'name',     type: 'text'     },
                    { label: 'Email *',         id: 'u-email', field: 'email',    type: 'email'    },
                    { label: 'Mot de passe *',  id: 'u-pass',  field: 'password', type: 'password' },
                    { label: 'Téléphone',       id: 'u-phone', field: 'phone',    type: 'tel'      },
                  ].map(({ label, id, field, type }) => (
                    <div key={field}>
                      <label htmlFor={id} className="wf-field-label">{label}</label>
                      <input
                        id={id} type={type}
                        value={(newForm as any)[field]}
                        onChange={e => handleFormChange(field, e.target.value)}
                        className="wf-inp box"
                        style={{ width: '100%', marginTop: 4 }}
                        aria-required={label.includes('*')}
                        autoComplete={type === 'email' ? 'email' : type === 'password' ? 'new-password' : undefined}
                      />
                    </div>
                  ))}

                  <div>
                    <label htmlFor="u-role" className="wf-field-label">Rôle *</label>
                    <select
                      id="u-role" className="wf-inp box"
                      style={{ width: '100%', marginTop: 4 }}
                      value={newForm.role}
                      onChange={e => handleFormChange('role', e.target.value)}
                      aria-required="true"
                    >
                      <option value="dispatcher">Dispatcher</option>
                      <option value="billing">Facturation</option>
                      <option value="management">Direction</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                    <button className="wf-btn" onClick={closeForm}>Annuler</button>
                    <button className="wf-btn fill" disabled={creating} onClick={createUser} aria-busy={creating}>
                      {creating ? 'Création…' : 'Créer'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="mono muted" style={{ textAlign: 'center', padding: '40px 0', fontSize: 12 }}>Chargement…</div>
          ) : (
            <div className="wf-box solid" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="wf-table">
                <thead>
                  <tr>
                    {['Nom', 'Email', 'Rôle', 'Téléphone', 'Inscrit le', 'Actions'].map(h => (
                      <th key={h} scope="col">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: '50%', background: 'var(--hi)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 11, flexShrink: 0,
                          }}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <b>{u.name}</b>
                        </div>
                      </td>
                      <td className="mono" style={{ fontSize: 11 }}>{u.email}</td>
                      <td>
                        <span className={`wf-pill ${ROLE_PILL[u.role] ?? ''}`} style={{ fontSize: 10 }}>
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{u.phone ?? '—'}</td>
                      <td className="mono" style={{ fontSize: 11 }}>
                        {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td>
                        {u.id !== user?.id && (
                          <button
                            className="wf-btn sm"
                            style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }}
                            disabled={deleting === u.id}
                            onClick={() => deleteUser(u.id, u.name)}
                          >
                            {deleting === u.id ? '…' : 'Supprimer'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                        — Aucun membre —
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
