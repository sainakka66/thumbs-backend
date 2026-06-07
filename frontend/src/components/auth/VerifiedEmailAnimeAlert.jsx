import { Sparkles, MailCheck } from 'lucide-react';
import Button from '../ui/Button';

export default function VerifiedEmailAnimeAlert({ emailMasked, onContinue, variant = 'verified' }) {
  const isNewVerify = variant === 'justVerified';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border-2 border-pink-300/60 bg-gradient-to-br from-pink-50 via-white to-violet-100 p-6 shadow-2xl dark:from-pink-950/40 dark:via-surface dark:to-violet-950/30"
        role="dialog"
        aria-labelledby="verified-email-title"
      >
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-pink-300/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-6 h-28 w-28 rounded-full bg-violet-300/30 blur-2xl" />

        <div className="relative flex flex-col items-center text-center">
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-violet-500 shadow-lg">
            <span className="text-4xl" aria-hidden>
              {isNewVerify ? '🎉' : '✨'}
            </span>
          </div>

          <div className="mb-1 flex items-center gap-1 text-pink-500">
            <Sparkles size={14} />
            <span className="text-xs font-bold uppercase tracking-widest">Email secure</span>
            <Sparkles size={14} />
          </div>

          <h2 id="verified-email-title" className="font-head text-xl font-extrabold text-text">
            {isNewVerify ? 'Email verified!' : "You're already verified!"}
          </h2>

          <p className="mt-2 text-sm text-sub">
            {isNewVerify
              ? 'Your email ownership is confirmed. Welcome aboard!'
              : 'This email was verified before — no new OTP needed.'}
          </p>

          {emailMasked && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-pink-200/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm dark:border-pink-500/30 dark:bg-surface2/80 dark:text-pink-200">
              <MailCheck size={18} className="shrink-0 text-pink-500" />
              <span>{emailMasked}</span>
            </div>
          )}

          <p className="mt-3 text-xs text-muted">
            {isNewVerify
              ? 'Future sign-ins skip the email code for this address.'
              : 'A new email on your account will trigger verification again.'}
          </p>

          <Button className="mt-5 w-full" onClick={onContinue}>
            Continue to workspace
          </Button>
        </div>
      </div>
    </div>
  );
}
