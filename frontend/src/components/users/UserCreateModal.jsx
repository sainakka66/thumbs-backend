import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { Field, Input } from '../ui/Field';
import Button from '../ui/Button';
import * as userService from '../../services/userService';

export default function UserCreateModal({ open, onClose, onCreated }) {
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({
    username: '',
    password: '',
    email: '',
    phone: '',
    roleSlug: 'SALESPERSON',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    userService.fetchRoles().then((r) => setRoles(r.roles || [])).catch(() => {});
  }, [open]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await userService.createUser(form);
      onCreated?.(res.user);
      onClose();
      setForm({ username: '', password: '', email: '', phone: '', roleSlug: 'SALESPERSON' });
    } catch (err) {
      setError(err.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create user" wide>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Username">
          <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required />
        </Field>
        <Field label="Password">
          <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
        </Field>
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
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create user'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
