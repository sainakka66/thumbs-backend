/**
 * Create or merge D:\ThumbsUpApp\.env without overwriting existing values.
 * Usage: node scripts/setup-env.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENV_PATH = path.join(__dirname, '..', '.env');

const DEFAULTS = {
  NODE_ENV: 'development',
  PORT: '3000',
  DB_HOST: 'localhost',
  DB_PORT: '3306',
  DB_NAME: 'thumbs_up',
  DB_USER: 'root',
  DB_PASSWORD: '',
  JWT_SECRET: 'dev-only-not-for-production-use-32chars!!',
  JWT_EXPIRES_IN: '1h',
  CORS_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
  LOGIN_RATE_LIMIT_MAX: '10',
  BCRYPT_ROUNDS: '12',
  RAZORPAY_KEY_ID: '',
  RAZORPAY_KEY_SECRET: '',
  RAZORPAY_WEBHOOK_SECRET: '',
  WEBHOOK_MAX_AGE_SEC: '300',
  ADMIN_IP_ALLOWLIST: '',
  SOCURE_API_KEY: '',
  SOCURE_BASE_URL: 'https://api.socure.com',
  SARDINE_API_KEY: '',
  SARDINE_BASE_URL: 'https://api.sardine.ai',
  LOG_LEVEL: 'info',
  ENFORCE_HTTPS: 'false',
  EMAIL_PROVIDER: 'smtp',
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: '',
  SMTP_PASS: '',
  SMTP_FROM: '',
  FRONTEND_URL: 'http://localhost:5173',
  MFA_EMAIL_OTP_EXPIRY_MIN: '10',
  EMAIL_VERIFY_EXPIRY_HOURS: '24',
};

function parseEnvFile(content) {
  const map = new Map();
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1);
    map.set(key, value);
  }
  return map;
}

function serializeEnv(map, header) {
  const keys = [...map.keys()];
  const body = keys.map((k) => `${k}=${map.get(k)}`).join('\n');
  return `${header}\n${body}\n`;
}

function main() {
  const created = !fs.existsSync(ENV_PATH);
  let existing = new Map();

  if (!created) {
    existing = parseEnvFile(fs.readFileSync(ENV_PATH, 'utf8'));
    console.log('[setup-env] Existing .env found — only missing keys will be added.');
  } else {
    console.log('[setup-env] No .env found — creating new file.');
  }

  let added = 0;
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (!existing.has(key)) {
      existing.set(key, value);
      added += 1;
    }
  }

  const header = [
    '# ThumbsUpApp backend — local development (auto-generated/merged by scripts/setup-env.js)',
    '# Never commit real secrets. Production: set vars on Render only.',
    `# Updated: ${new Date().toISOString()}`,
  ].join('\n');

  fs.writeFileSync(ENV_PATH, serializeEnv(existing, header), 'utf8');
  console.log(`[setup-env] Wrote ${ENV_PATH}`);
  console.log(`[setup-env] Keys added: ${added}, total keys: ${existing.size}`);
  if (created) {
    console.log('[setup-env] Tip: set DB_PASSWORD if your local MySQL root requires one.');
  }
}

main();
