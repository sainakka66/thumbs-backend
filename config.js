/**
 * Shared configuration — loads .env, never embeds secrets in source.
 */
require('dotenv').config();

const DEFAULT_DISABLED_USERNAMES = new Set([
  'demo',
  'test',
  'guest',
  'sample',
  'example',
  'administrator',
  'password',
  'user',
  'root',
]);

function needsMysqlSsl(hostname = '') {
  return (
    process.env.MYSQL_SSL === 'true' ||
    hostname.includes('railway') ||
    hostname.includes('rlwy.net')
  );
}

function getDbConfig() {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (url) {
    const parsed = new URL(url);
    const config = {
      host: parsed.hostname,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, '').split('?')[0],
      port: parseInt(parsed.port || '3306', 10),
      waitForConnections: true,
      connectionLimit: 10,
    };
    const sslMode = parsed.searchParams.get('ssl-mode') || parsed.searchParams.get('ssl');
    if (sslMode === 'REQUIRED' || needsMysqlSsl(parsed.hostname)) {
      config.ssl = { rejectUnauthorized: false };
    }
    return config;
  }

  const host = process.env.MYSQLHOST || process.env.DB_HOST;
  const user = process.env.MYSQLUSER || process.env.DB_USER;
  const password =
    process.env.MYSQLPASSWORD !== undefined
      ? process.env.MYSQLPASSWORD
      : process.env.DB_PASSWORD !== undefined
        ? process.env.DB_PASSWORD
        : undefined;
  const database = process.env.MYSQLDATABASE || process.env.DB_NAME;
  const port = parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10);

  if (host && user && database && password !== undefined) {
    const config = {
      host,
      user,
      password,
      database,
      port,
      waitForConnections: true,
      connectionLimit: 10,
    };
    if (needsMysqlSsl(host)) {
      config.ssl = { rejectUnauthorized: false };
    }
    return config;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Database not configured. Set DATABASE_URL or MYSQLHOST/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE.'
    );
  }

  return null;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET is required in production (minimum 32 characters).');
    }
    return secret;
  }
  if (secret && secret.length >= 32) return secret;
  return secret || 'dev-only-not-for-production-use-32chars!!';
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '1h';
}

/** Always allowed when CORS_ORIGINS is set (local dev + production frontend). */
const DEFAULT_CORS_ORIGINS = [
  'https://thumbs-up-app-two.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

function getCorsOrigins() {
  const fromEnv = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...fromEnv, ...DEFAULT_CORS_ORIGINS])];
}

function getDisabledUsernames() {
  const extra = (process.env.DISABLED_USERNAMES || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_DISABLED_USERNAMES, ...extra]);
}

function isUsernameDisabled(username) {
  const name = String(username || '').trim().toLowerCase();
  if (!name) return true;
  const disabled = getDisabledUsernames();
  if (disabled.has(name)) return true;
  if (/^(demo|test|guest|sample)/.test(name)) return true;
  return false;
}

function isBcryptHash(stored) {
  return typeof stored === 'string' && /^\$2[aby]\$\d{2}\$/.test(stored);
}

function validatePassword(password) {
  if (typeof password !== 'string') {
    return 'Password is required.';
  }
  if (password.length < 12) {
    return 'Password must be at least 12 characters.';
  }
  if (password.length > 128) {
    return 'Password must be at most 128 characters.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include a lowercase letter.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include an uppercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include a number.';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must include a special character.';
  }
  return null;
}

module.exports = {
  getDbConfig,
  getJwtSecret,
  getJwtExpiresIn,
  getCorsOrigins,
  getDisabledUsernames,
  isUsernameDisabled,
  isBcryptHash,
  validatePassword,
};
