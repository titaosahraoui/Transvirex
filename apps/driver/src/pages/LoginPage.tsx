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
      navigate('/missions');
    } catch {
      setError('Email ou mot de passe incorrect');
    } finally { setLoading(false); }
  }

  return (
    <div className="wf-login">
      <div className="wf-login-card">
        <div className="wf-login-brand">transvirex<span style={{ color: 'var(--accent)' }}>.</span></div>
        <div className="wf-login-sub">Espace Chauffeur</div>

        {error && <div className="wf-error">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="wf-field-label">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="wf-inp box" placeholder="karim@transvirex.fr"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label className="wf-field-label">Mot de passe</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="wf-inp box" placeholder="••••••••"
              style={{ width: '100%' }}
            />
          </div>
          <button type="submit" disabled={loading} className="wf-btn fill block" style={{ marginTop: 4 }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <hr className="wf-wave" />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>
          Pas de compte ?{' '}
          <Link to="/register" style={{ color: 'var(--ink)', fontWeight: 700, textDecoration: 'underline dotted' }}>
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}
