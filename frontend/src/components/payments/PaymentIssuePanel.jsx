import {
  ISSUE_ROOMS,
  PAYMENT_ISSUE_KINDS,
  classifyPaymentIssue,
} from '../../lib/paymentIssues';

const SEVERITY_STYLES = {
  error: 'border-red-500/40 bg-red-500/10',
  warning: 'border-amber-500/40 bg-amber-500/10',
  info: 'border-blue-500/40 bg-blue-500/10',
  success: 'border-emerald-500/40 bg-emerald-500/10',
  neutral: 'border-border bg-surface2',
};

const SEVERITY_TEXT = {
  error: 'text-red-200',
  warning: 'text-amber-200',
  info: 'text-blue-200',
  success: 'text-emerald-200',
  neutral: 'text-sub',
};

/**
 * One isolated "room" per issue kind — only the active room is visible.
 */
export default function PaymentIssuePanel({
  status,
  error,
  gatewayReady,
  checkoutExhausted,
  checkoutTier,
  checkoutAttempt,
}) {
  const activeKind = classifyPaymentIssue({
    status,
    error,
    gatewayReady,
    checkoutExhausted,
  });

  if (activeKind === PAYMENT_ISSUE_KINDS.IDLE) return null;

  const room = ISSUE_ROOMS[activeKind];
  if (!room) return null;

  const borderStyle = SEVERITY_STYLES[room.severity] || SEVERITY_STYLES.neutral;
  const textStyle = SEVERITY_TEXT[room.severity] || SEVERITY_TEXT.neutral;

  return (
    <div className="mt-4" role="alert" aria-live="polite">
      <div className={`rounded-lg border px-4 py-3 ${borderStyle}`}>
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold ${textStyle}`}>{room.title}</p>
          {checkoutTier && activeKind === PAYMENT_ISSUE_KINDS.PROCESSING && (
            <span className="shrink-0 text-xs text-muted">
              attempt {checkoutAttempt} · {checkoutTier}
            </span>
          )}
        </div>
        <p className={`mt-1 text-xs leading-relaxed ${textStyle} opacity-90`}>{room.summary}</p>
        {error && activeKind !== PAYMENT_ISSUE_KINDS.PROCESSING && (
          <p className="mt-2 rounded bg-black/20 px-2 py-1 font-mono text-xs opacity-80">{error}</p>
        )}
        {room.hint && (
          <p className={`mt-2 text-xs leading-relaxed ${textStyle} opacity-75`}>{room.hint}</p>
        )}
      </div>
    </div>
  );
}
