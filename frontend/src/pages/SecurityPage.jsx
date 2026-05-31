import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import * as securityApi from '../services/securityService';

export default function SecurityPage() {
  const qc = useQueryClient();
  const [totpCode, setTotpCode] = useState('');
  const [qrUrl, setQrUrl] = useState('');

  const { data: mfa } = useQuery({ queryKey: ['mfa-status'], queryFn: securityApi.fetchMfaStatus });
  const { data: sessions } = useQuery({ queryKey: ['sessions'], queryFn: securityApi.fetchSessions });
  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: securityApi.fetchDevices });

  const setupTotp = useMutation({
    mutationFn: securityApi.setupTotp,
    onSuccess: (d) => setQrUrl(d.otpauthUrl || ''),
  });

  const verifyTotp = useMutation({
    mutationFn: () => securityApi.verifyTotp(totpCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mfa-status'] });
      setTotpCode('');
    },
  });

  return (
    <div className="page-container space-y-6">
      <PageHeader title="Security" subtitle="MFA, sessions, and trusted devices" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody className="space-y-4">
            <h3 className="font-bold text-text">Multi-factor authentication</h3>
            <p className="text-sm text-sub">
              TOTP: {mfa?.totpEnabled ? 'Enabled' : 'Off'} · Email OTP: {mfa?.emailOtpEnabled ? 'On' : 'Off'}
            </p>
            <Button size="sm" onClick={() => setupTotp.mutate()}>Set up authenticator</Button>
            {qrUrl && (
              <p className="break-all text-xs text-muted">
                Scan in Google Authenticator: {qrUrl}
              </p>
            )}
            <Field label="Authenticator code">
              <Input value={totpCode} onChange={(e) => setTotpCode(e.target.value)} />
            </Field>
            <Button size="sm" onClick={() => verifyTotp.mutate()} disabled={!totpCode}>
              Verify & enable
            </Button>
            <Button variant="secondary" size="sm" onClick={() => securityApi.enableEmailMfa().then(() => qc.invalidateQueries({ queryKey: ['mfa-status'] }))}>
              Enable email OTP
            </Button>
            <Button variant="ghost" size="sm" onClick={() => securityApi.regenerateBackupCodes().then((d) => alert(`Backup codes:\n${(d.backupCodes || []).join('\n')}`))}>
              Regenerate backup codes
            </Button>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-text">Active sessions</h3>
              <Button variant="ghost" size="sm" onClick={() => securityApi.revokeAllSessions().then(() => qc.invalidateQueries({ queryKey: ['sessions'] }))}>
                Revoke all
              </Button>
            </div>
            <ul className="space-y-2 text-sm">
              {(sessions?.sessions || []).map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span>
                    {s.deviceLabel || s.browserName} · {s.ipAddress || '—'}
                    {s.isCurrent && <span className="ml-2 text-brand">(this device)</span>}
                  </span>
                  {!s.isCurrent && (
                    <Button variant="ghost" size="sm" onClick={() => securityApi.revokeSession(s.id).then(() => qc.invalidateQueries({ queryKey: ['sessions'] }))}>
                      Revoke
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardBody>
            <h3 className="mb-3 font-bold text-text">Trusted devices</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {(devices?.devices || []).map((d) => (
                <li key={d.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="font-medium">{d.device_label || d.device_fingerprint?.slice(0, 12)}</div>
                  <div className="text-muted">{d.browser_name} · {d.os_name}</div>
                  <div className="text-xs text-sub">{d.is_verified ? 'Verified' : 'Pending'} · {d.ip_address}</div>
                  {!d.is_verified && (
                    <Button className="mt-2" size="sm" onClick={() => securityApi.trustDevice(d.id).then(() => qc.invalidateQueries({ queryKey: ['devices'] }))}>
                      Trust
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
