import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    setError(''); setLoading(true);
    try {
      await register(email, password, name, phone || undefined);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Échec de la création du compte');
    } finally { setLoading(false); }
  }

  return (
    <div className="wf-login">
      <div className="wf-login-card">
        <div className="wf-login-brand">transvirex<span style={{ color: 'var(--accent)' }}>.</span></div>
        <div className="wf-login-sub">Créer un compte Direction</div>

        {error && <div className="wf-error">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Nom complet',  val: name,     set: setName,     type: 'text',     ph: 'Marie Dupont',            req: true  },
            { label: 'Email',        val: email,    set: setEmail,    type: 'email',    ph: 'marie@transvirex.fr',     req: true  },
            { label: 'Téléphone',    val: phone,    set: setPhone,    type: 'tel',      ph: '+33 1 23 …',              req: false },
            { label: 'Mot de passe', val: password, set: setPassword, type: 'password', ph: '••••••••',                req: true  },
            { label: 'Confirmation', val: confirm,  set: setConfirm,  type: 'password', ph: '••••••••',                req: true  },
          ].map(({ label, val, set, type, ph, req }) => (
            <div key={label}>
              <label className="wf-field-label">
                {label}{!req && <span className="muted"> (optionnel)</span>}
              </label>
              <input
                type={type} value={val} onChange={e => set(e.target.value)}
                required={req} placeholder={ph} minLength={type === 'password' ? 6 : undefined}
                className="wf-inp box" style={{ width: '100%' }}
              />
            </div>
          ))}
          <button type="submit" disabled={loading} className="wf-btn fill block" style={{ marginTop: 4 }}>
            {loading ? 'Création…' : 'Créer le compte'}
          </button>
        </form>

        <hr className="wf-wave" />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>
          Déjà un compte ?{' '}
          <Link to="/login" style={{ color: 'var(--ink)', fontWeight: 700, textDecoration: 'underline dotted' }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
