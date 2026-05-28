const crypto = require('crypto');

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function randomUuid() {
  return crypto.randomUUID();
}

function timingSafeEqualHex(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}

module.exports = { sha256, randomUuid, timingSafeEqualHex };
