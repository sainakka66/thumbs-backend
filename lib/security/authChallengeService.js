const jwt = require('jsonwebtoken');
const { getJwtExpiresIn } = require('../../config');

function createPendingChallenge(payload, secret) {
  return jwt.sign(
    {
      type: 'auth_challenge',
      ...payload,
    },
    secret,
    { expiresIn: '10m' }
  );
}

function verifyPendingChallenge(token, secret) {
  try {
    const decoded = jwt.verify(token, secret);
    if (decoded.type !== 'auth_challenge') return null;
    return decoded;
  } catch {
    return null;
  }
}

module.exports = { createPendingChallenge, verifyPendingChallenge };
