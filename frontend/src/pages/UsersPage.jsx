import { useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import UserCreateModal from '../components/users/UserCreateModal';
import UserEditModal from '../components/users/UserEditModal';
import * as userService from '../services/userService';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    const data = await userService.fetchUsers();
    setUsers(data.users || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function removeUser(u) {
    if (!window.confirm(`Soft-delete user ${u.username}?`)) return;
    await userService.deleteUser(u.id);
    load();
  }

  return (
    <div className="page-container pb-20 lg:pb-0">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="User Management" subtitle="Create, edit, and assign roles" />
        <Button onClick={() => setCreateOpen(true)}>+ New user</Button>
      </div>

      {error && <p className="mb-4 text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Username</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Active</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border/50">
                <td className="p-3">{u.id}</td>
                <td className="p-3 font-medium">{u.username}</td>
                <td className="p-3">{u.role_slug || u.role}</td>
                <td className="p-3">{u.status}</td>
                <td className="p-3">{u.is_active ? 'Yes' : 'No'}</td>
                <td className="p-3 space-x-2">
                  <button type="button" className="text-brand" onClick={() => setEditUser(u)}>
                    Edit
                  </button>
                  <button type="button" className="text-red-400" onClick={() => removeUser(u)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && <p className="p-6 text-center text-muted">No users found.</p>}
      </div>

      <UserCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => load()}
      />
      <UserEditModal
        open={Boolean(editUser)}
        user={editUser}
        onClose={() => setEditUser(null)}
        onSaved={() => {
          setEditUser(null);
          load();
        }}
      />
    </div>
  );
}
