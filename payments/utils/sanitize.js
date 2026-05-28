function stripHtml(str) {
  return String(str || '').replace(/<[^>]*>/g, '');
}

function sanitizeString(str, maxLen = 512) {
  if (str == null) return null;
  return stripHtml(String(str).trim()).slice(0, maxLen);
}

function sanitizeEmail(email) {
  const e = sanitizeString(email, 255);
  if (!e) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e.toLowerCase() : null;
}

function sanitizePhone(phone) {
  const p = String(phone || '').replace(/\D/g, '');
  return p.length >= 10 && p.length <= 15 ? p : null;
}

function parseAmountInr(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

function inrToPaise(inr) {
  return Math.round(inr * 100);
}

module.exports = {
  stripHtml,
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  parseAmountInr,
  inrToPaise,
};
