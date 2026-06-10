import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/invoices');
    } catch {
      setError('Email ou mot de passe incorrect');
    } finally { setLoading(false); }
  }

  return (
    <div className="wf-login">
      <main className="wf-login-card" aria-label="Connexion">
        <div className="wf-login-brand">transvirex<span style={{ color: 'var(--accent)' }}>.</span></div>
        <div className="wf-login-sub">Facturation · Gestion des factures</div>

        {error && <div className="wf-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label htmlFor="login-email" className="wf-field-label">Email</label>
            <input
              id="login-email"
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="wf-inp box" placeholder="facturation@transvirex.fr"
              style={{ width: '100%' }}
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="wf-field-label">Mot de passe</label>
            <input
              id="login-password"
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="wf-inp box" placeholder="••••••••"
              style={{ width: '100%' }}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" disabled={loading} className="wf-btn fill block" style={{ marginTop: 6 }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <hr className="wf-wave" />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>
          Pas encore de compte ?{' '}
          <Link to="/register" style={{ color: 'var(--ink)', fontWeight: 700, textDecoration: 'underline dotted' }}>
            Créer un compte
          </Link>
        </p>
      </main>
    </div>
  );
}
