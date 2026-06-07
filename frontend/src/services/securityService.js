import { apiJson } from './api';
import { apiUrl, parseJsonResponse } from './api';
import { deviceHeaders } from '../lib/deviceFingerprint';

export function fetchMfaStatus() {
  return apiJson('/security/mfa/status');
}

export function fetchEmailStatus() {
  return apiJson('/security/email/status');
}

export function sendEmailVerification() {
  return apiJson('/security/email/send-verification', { method: 'POST' });
}

export async function verifyEmailToken(token) {
  const url = apiUrl('/auth/email/verify');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...deviceHeaders() },
    body: JSON.stringify({ token }),
  });
  const data = await parseJsonResponse(res, url);
  if (!res.ok || !data?.success) throw new Error(data?.message || 'Verification failed');
  return data;
}

export function setupTotp() {
  return apiJson('/security/mfa/totp/setup', { method: 'POST' });
}

export function verifyTotp(code) {
  return apiJson('/security/mfa/totp/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function sendEmailOtp(purpose = 'mfa_login') {
  return apiJson('/security/mfa/email/send', {
    method: 'POST',
    body: JSON.stringify({ purpose }),
  });
}

export function enableEmailMfa() {
  return apiJson('/security/mfa/email/enable', { method: 'POST' });
}

export function regenerateBackupCodes() {
  return apiJson('/security/mfa/backup/regenerate', { method: 'POST' });
}

export async function verifyLoginChallenge({ pendingToken, code, method }) {
  const url = apiUrl('/login/mfa/verify');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...deviceHeaders() },
    body: JSON.stringify({ pendingToken, code, method }),
  });
  const data = await parseJsonResponse(res, url);
  if (!res.ok || !data?.success) throw new Error(data?.message || 'Verification failed');
  return data;
}

export async function resendLoginOtp({ pendingToken, purpose }) {
  const url = apiUrl('/login/mfa/resend');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...deviceHeaders() },
    body: JSON.stringify({ pendingToken, purpose }),
  });
  const data = await parseJsonResponse(res, url);
  if (!res.ok || !data?.success) throw new Error(data?.message || 'Resend failed');
  return data;
}

export function fetchSessions() {
  return apiJson('/security/sessions');
}

export function revokeSession(id) {
  return apiJson(`/security/sessions/${id}`, { method: 'DELETE' });
}

export function revokeAllSessions() {
  return apiJson('/security/sessions/revoke-all', { method: 'POST' });
}

export function fetchDevices() {
  return apiJson('/security/devices');
}

export function trustDevice(id) {
  return apiJson(`/security/devices/${id}/trust`, { method: 'POST' });
}

export function fetchSecurityAudit(params = '') {
  return apiJson(`/security/audit/events${params}`);
}

export function fetchRiskDashboard() {
  return apiJson('/risk/dashboard');
}
