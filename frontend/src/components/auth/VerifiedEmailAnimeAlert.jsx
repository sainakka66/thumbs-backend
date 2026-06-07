import { Sparkles, MailCheck } from 'lucide-react';
import Button from '../ui/Button';

const floatKeyframes = `
@keyframes va-float {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.9; }
  50% { transform: translateY(-8px) rotate(8deg); opacity: 1; }
}
@keyframes va-pop {
  0% { transform: scale(0.85); opacity: 0; }
  60% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes va-shimmer {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
`;

export default function VerifiedEmailAnimeAlert({ emailMasked, onContinue, variant = 'verified' }) {
  const isNewVerify = variant === 'justVerified';

  return (
    <>
      <style>{floatKeyframes}</style>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md">
        <div
          className="relative w-full max-w-sm overflow-hidden rounded-3xl border-2 border-pink-300/70 p-6 shadow-2xl"
          style={{
            animation: 'va-pop 0.45s ease-out',
            background: 'linear-gradient(135deg, #fff0f6 0%, #ffffff 40%, #f3e8ff 100%)',
          }}
          role="dialog"
          aria-labelledby="verified-email-title"
        >
          <span
            className="pointer-events-none absolute left-4 top-6 text-2xl"
            style={{ animation: 'va-float 2.2s ease-in-out infinite' }}
            aria-hidden
          >
            ✨
          </span>
          <span
            className="pointer-events-none absolute right-6 top-4 text-xl"
            style={{ animation: 'va-float 2.8s ease-in-out infinite 0.4s' }}
            aria-hidden
          >
            🌸
          </span>
          <span
            className="pointer-events-none absolute bottom-16 left-8 text-lg"
            style={{ animation: 'va-float 3s ease-in-out infinite 0.8s' }}
            aria-hidden
          >
            💫
          </span>

          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-pink-300/40 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-6 h-28 w-28 rounded-full bg-violet-300/40 blur-2xl" />

          <div className="relative flex flex-col items-center text-center">
            <div
              className="mb-3 flex h-24 w-24 items-center justify-center rounded-full shadow-xl"
              style={{
                background: 'linear-gradient(135deg, #f472b6, #8b5cf6, #ec4899)',
                backgroundSize: '200% 200%',
                animation: 'va-shimmer 3s linear infinite',
              }}
            >
              <span className="text-5xl drop-shadow-md" aria-hidden>
                {isNewVerify ? '🎉' : '(◕‿◕)✧'}
              </span>
            </div>

            <div className="mb-1 flex items-center gap-1 text-pink-500">
              <Sparkles size={14} className="animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest">Email secure</span>
              <Sparkles size={14} className="animate-pulse" />
            </div>

            <h2 id="verified-email-title" className="font-head text-xl font-extrabold text-violet-900">
              {isNewVerify ? 'Email verified!' : "You're already verified!"}
            </h2>

            <p className="mt-2 text-sm text-violet-700/90">
              {isNewVerify
                ? 'Your email ownership is confirmed. Welcome aboard!'
                : 'This email was verified before — no new OTP needed.'}
            </p>

            {emailMasked && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border-2 border-pink-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-md">
                <MailCheck size={18} className="shrink-0 text-pink-500" />
                <span>{emailMasked}</span>
              </div>
            )}

            <p className="mt-3 text-xs text-violet-600/80">
              {isNewVerify
                ? 'Future sign-ins skip the email code for this address.'
                : 'A new email on your account will trigger verification again.'}
            </p>

            <Button className="mt-5 w-full shadow-lg" onClick={onContinue}>
              Continue to workspace ✨
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
