import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';

function validatePassword(password) {
  if (!password || password.length < 12) return 'Password must be at least 12 characters.';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include a number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include a special character.';
  return null;
}

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [tab, setTab] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to={from} replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Enter username and password.');
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      setPassword('');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink p-4">
      <div className="relative w-full max-w-[420px] rounded-xl border border-border bg-surface p-6 shadow-card md:p-10">
        <div className="absolute left-0 right-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-brand to-brand-light" />
        <div className="mb-1 font-head text-3xl font-extrabold tracking-wide text-brand">
          👍 Sipster<span className="text-text"> 🍺</span>
        </div>
        <p className="mb-6 text-sm text-sub">Distribution Management System</p>

        <div className="mb-6 flex overflow-hidden rounded-md border border-border">
          {['login', 'signup'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setError('');
              }}
              className={`flex-1 py-2.5 font-head text-sm font-semibold uppercase tracking-wider ${
                tab === t ? 'bg-brand text-white' : 'bg-transparent text-sub'
              }`}
            >
              {t === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="Username">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Your username"
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter your password"
              />
            </Field>
            {error && <p className="text-center text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </Button>
          </form>
        ) : (
          <p className="text-center text-sm text-sub">
            {validatePassword(password) ||
              'Sign-up is disabled. Contact your administrator for an account.'}
          </p>
        )}
      </div>
    </div>
  );
}
