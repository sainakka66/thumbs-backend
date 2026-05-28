require('dotenv').config();

function getSecurityConfig() {
  return {
    webhookMaxAgeSec: parseInt(process.env.WEBHOOK_MAX_AGE_SEC || '300', 10),
    enforceHttps: process.env.ENFORCE_HTTPS !== 'false' && process.env.NODE_ENV === 'production',
    hstsMaxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000', 10),
    adminSessionMaxMin: parseInt(process.env.ADMIN_SESSION_MAX_MIN || '30', 10),
    adminIpAllowlist: (process.env.ADMIN_IP_ALLOWLIST || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    riskProvider: (process.env.RISK_PROVIDER || 'internal').toLowerCase(),
    socureEnabled: process.env.SOCURE_API_KEY && process.env.SOCURE_ENABLED === 'true',
    sardineEnabled: process.env.SARDINE_API_KEY && process.env.SARDINE_ENABLED === 'true',
    socureApiKey: process.env.SOCURE_API_KEY || '',
    socureBaseUrl: process.env.SOCURE_BASE_URL || 'https://api.socure.com',
    sardineApiKey: process.env.SARDINE_API_KEY || '',
    sardineBaseUrl: process.env.SARDINE_BASE_URL || 'https://api.sardine.ai',
    fieldEncryptionKey: process.env.FIELD_ENCRYPTION_KEY || '',
  };
}

function getRiskThresholds() {
  return {
    low: 25,
    medium: 50,
    high: 75,
    critical: 90,
  };
}

module.exports = { getSecurityConfig, getRiskThresholds };
