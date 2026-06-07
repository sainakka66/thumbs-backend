import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ThumbsUp, User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import * as securityApi from '../services/securityService';

export default function LoginPage() {
  const { isAuthenticated, login, completeLoginChallenge } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [otp, setOtp] = useState('');
  const [otpMethod, setOtpMethod] = useState('email');
  const [resendCooldown, setResendCooldown] = useState(false);

  if (isAuthenticated) return <Navigate to={from} replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!username.trim() || !password) {
      setError('Enter username and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await login(username.trim(), password);
      if (result?.challengeRequired) {
        setChallenge(result);
        setOtpMethod(result.defaultMethod || result.mfaMethods?.[0] || 'email');
        setPassword('');
        if (result.emailMasked) {
          setInfo(`A verification code was sent to ${result.emailMasked}.`);
        }
        return;
      }
      setPassword('');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!challenge?.pendingToken || resendCooldown) return;
    setError('');
    setResendCooldown(true);
    try {
      const purpose =
        challenge.deviceVerificationRequired && challenge.mfaRequired
          ? 'login_challenge'
          : challenge.deviceVerificationRequired
            ? 'device_verify'
            : 'mfa_login';
      const result = await securityApi.resendLoginOtp({
        pendingToken: challenge.pendingToken,
        purpose,
      });
      setInfo(result.message || 'A new code was sent.');
      setTimeout(() => setResendCooldown(false), 60000);
    } catch (err) {
      setResendCooldown(false);
      setError(err.message || 'Could not resend code.');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] grid grid-cols-1 bg-bg lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-dark via-brand to-brand-dark p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-white">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur">
            <ThumbsUp size={24} strokeWidth={2.4} />
          </span>
          <div>
            <div className="font-head text-2xl font-extrabold leading-none">Vaishnavi Agencies</div>
            <div className="text-xs uppercase tracking-[0.18em] text-white/70">Distribution</div>
          </div>
        </div>

        <div className="relative z-10 max-w-md text-white">
          <h2 className="font-head text-4xl font-extrabold leading-tight">
            Distribution management, simplified.
          </h2>
          <p className="mt-4 text-white/80">
            Sales, inventory, deliveries, customers and payments — one fast, mobile-ready workspace.
          </p>
        </div>

        <p className="text-xs text-white/60">Enterprise distribution · RBAC enabled</p>
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-20 -left-10 h-60 w-60 rounded-full bg-black/10 blur-3xl" />
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white">
              <ThumbsUp size={20} strokeWidth={2.4} />
            </span>
            <span className="font-head text-xl font-extrabold">Vaishnavi Agencies</span>
          </div>

          <h1 className="font-head text-3xl font-extrabold tracking-tight text-text">Welcome back</h1>
          <p className="mt-1 mb-7 text-sm text-sub">Sign in to continue to your workspace.</p>

          {challenge && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setError('');
                setLoading(true);
                try {
                  await completeLoginChallenge({
                    pendingToken: challenge.pendingToken,
                    code: otp,
                    method: otpMethod,
                  });
                  navigate(from, { replace: true });
                } catch (err) {
                  setError(err.message || 'Verification failed');
                } finally {
                  setLoading(false);
                }
              }}
              className="mb-6 space-y-4 rounded-xl border border-border bg-surface2/50 p-4"
            >
              <p className="text-sm font-medium text-text">
                {challenge.deviceVerificationRequired
                  ? 'Verify this device — enter the code from your verified email'
                  : 'Enter your verification code from email'}
              </p>
              {info && <p className="text-xs text-sub">{info}</p>}
              {challenge.mfaMethods?.length > 1 && (
                <div className="flex gap-2">
                  {challenge.deviceVerificationRequired && (
                    <button
                      type="button"
                      onClick={() => setOtpMethod('device')}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold ${otpMethod === 'device' ? 'bg-brand text-white' : 'bg-surface text-sub'}`}
                    >
                      device
                    </button>
                  )}
                  {challenge.mfaMethods.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setOtpMethod(m)}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold ${otpMethod === m ? 'bg-brand text-white' : 'bg-surface text-sub'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
              <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" inputMode="numeric" />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying…' : 'Continue'}
              </Button>
              <div className="flex items-center justify-between">
                <button type="button" className="text-xs text-muted underline" onClick={() => setChallenge(null)}>
                  Back to sign in
                </button>
                <button
                  type="button"
                  className="text-xs text-brand underline disabled:opacity-50"
                  onClick={handleResend}
                  disabled={resendCooldown}
                >
                  {resendCooldown ? 'Resend available in 1 min' : 'Resend code'}
                </button>
              </div>
            </form>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="Username">
              <div className="relative">
                <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="Your username"
                  className="pl-9"
                />
              </div>
            </Field>
            <Field label="Password">
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-surface2 hover:text-text"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && <ArrowRight size={16} />}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted">
            Contact your administrator if you need an account.
          </p>
        </div>
      </div>
    </div>
  );
}
