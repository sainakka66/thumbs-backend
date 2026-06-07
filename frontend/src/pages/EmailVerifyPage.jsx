import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ThumbsUp, CheckCircle, XCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import * as securityApi from '../services/securityService';

export default function EmailVerifyPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState(token ? 'loading' : 'missing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await securityApi.verifyEmailToken(token);
        if (!cancelled) {
          setStatus('success');
          setMessage(result.message || 'Email verified successfully.');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setMessage(err.message || 'Verification failed.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-brand text-white">
          <ThumbsUp size={22} />
        </div>
        <h1 className="font-head text-2xl font-extrabold text-text">Email verification</h1>

        {status === 'loading' && <p className="mt-4 text-sm text-sub">Verifying your email address…</p>}

        {status === 'missing' && (
          <p className="mt-4 text-sm text-danger">No verification token found. Open the link from your email.</p>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto mt-4 text-brand" size={40} />
            <p className="mt-3 text-sm text-text">{message}</p>
            <p className="mt-2 text-xs text-sub">You can now enable email MFA from Security settings.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="mx-auto mt-4 text-danger" size={40} />
            <p className="mt-3 text-sm text-danger">{message}</p>
            <p className="mt-2 text-xs text-sub">Sign in and request a new verification email from Security.</p>
          </>
        )}

        <Link to="/login" className="mt-6 inline-block">
          <Button>Go to sign in</Button>
        </Link>
      </div>
    </div>
  );
}
