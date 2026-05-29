import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { Field, Input } from '../ui/Field';
import Button from '../ui/Button';
import * as userService from '../../services/userService';

export default function UserEditModal({ open, user, onClose, onSaved }) {
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({ email: '', phone: '', roleSlug: '' });
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setForm({
      email: user.email || '',
      phone: user.phone || '',
      roleSlug: user.role_slug || 'SALESPERSON',
    });
    userService.fetchRoles().then((r) => setRoles(r.roles || [])).catch(() => {});
  }, [open, user]);

  async function saveProfile(e) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      const res = await userService.updateUser(user.id, form);
      onSaved?.(res.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    if (!user || !newPassword) return;
    setSaving(true);
    setError('');
    try {
      await userService.resetUserPassword(user.id, newPassword);
      setNewPassword('');
      alert('Password reset successfully');
    } catch (err) {
      setError(err.message || 'Reset failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    if (!user) return;
    const active = user.is_active === 1 && user.status === 'active';
    await userService.patchUserStatus(user.id, {
      status: active ? 'suspended' : 'active',
      is_active: active ? 0 : 1,
    });
    onSaved?.();
  }

  if (!user) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Edit ${user.username}`} wide>
      <form onSubmit={saveProfile} className="space-y-4">
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </Field>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Role</span>
          <select
            value={form.roleSlug}
            onChange={(e) => setForm((f) => ({ ...f, roleSlug: e.target.value }))}
            className="w-full rounded border border-border bg-surface px-3 py-2"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.slug}>
                {r.name} ({r.slug})
              </option>
            ))}
          </select>
        </label>
        <div className="rounded border border-border p-3">
          <p className="mb-2 text-sm font-medium">Reset password</p>
          <Field label="New password">
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </Field>
          <Button type="button" className="mt-2" onClick={resetPassword} disabled={!newPassword || saving}>
            Reset password
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={toggleActive}>
            {user.is_active === 1 ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
