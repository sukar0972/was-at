import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Plus, Pencil, Trash2, UserCog, Shield, User, Loader2 } from 'lucide-react';

function UserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    username: user?.username || '',
    display_name: user?.display_name || '',
    password: '',
    is_admin: user?.is_admin || false,
    is_disabled: user?.is_disabled || false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const { user: currentUser } = useAuth();
  const isSelf = user?.id === currentUser?.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const data = {
      display_name: form.display_name,
      is_admin: form.is_admin,
      is_disabled: form.is_disabled,
    };
    if (form.password) data.password = form.password;
    if (!user) {
      await onSave({ username: form.username, display_name: form.display_name, password: form.password || 'password', is_admin: form.is_admin });
    } else {
      await onSave(data);
    }
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6 max-w-md w-full shadow-xl animate-slide-up">
        <h3 className="text-lg font-semibold mb-4">{user ? 'Edit User' : 'Create User'}</h3>

        {isSelf && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm">
            You are editing your own account. Be careful not to lock yourself out.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!user && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Username</label>
              <input
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Display Name</label>
            <input
              value={form.display_name}
              onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              {user ? 'New Password (leave blank to keep current)' : 'Password'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
              {...(!user && { required: true })}
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_admin}
                onChange={e => setForm(f => ({ ...f, is_admin: e.target.checked }))}
                className="w-4 h-4 rounded border-border-light dark:border-border-dark text-primary focus:ring-primary"
              />
              <span className="text-sm">Admin</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_disabled}
                onChange={e => setForm(f => ({ ...f, is_disabled: e.target.checked }))}
                className="w-4 h-4 rounded border-border-light dark:border-border-dark text-primary focus:ring-primary"
              />
              <span className="text-sm">Disabled</span>
            </label>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-border-light dark:border-border-dark hover:bg-border-light dark:hover:bg-border-dark transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-dark disabled:opacity-60 flex items-center gap-2 transition-colors"
            >
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              {isSaving ? 'Saving...' : user ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Admin() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [modalUser, setModalUser] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: fetchAdminUsers,
  });

  const createMut = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateAdminUser(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const handleSave = (data) => {
    if (modalUser) {
      return updateMut.mutateAsync({ id: modalUser.id, data });
    }
    return createMut.mutateAsync(data);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">User Management</h1>
        <button
          onClick={() => setModalUser('new')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          <Plus size={16} />
          Create User
        </button>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-light dark:text-muted-dark">
            <Loader2 size={24} className="animate-spin mx-auto mb-2" />
            Loading users...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark">
                  <th className="text-left px-4 py-3 font-medium text-muted-light dark:text-muted-dark">Username</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-light dark:text-muted-dark">Display Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-light dark:text-muted-dark">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-light dark:text-muted-dark">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-light dark:text-muted-dark">Created</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-light dark:text-muted-dark">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-border-light/50 dark:border-border-dark/50 hover:bg-bg-light/50 dark:hover:bg-bg-dark/50 transition-colors">
                    <td className="px-4 py-3 font-mono">{user.username}</td>
                    <td className="px-4 py-3">{user.display_name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        user.is_admin
                          ? 'bg-primary/10 text-primary'
                          : 'bg-border-light dark:bg-border-dark text-muted-light dark:text-muted-dark'
                      }`}>
                        {user.is_admin ? <Shield size={12} /> : <User size={12} />}
                        {user.is_admin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        user.is_disabled
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {user.is_disabled ? 'Disabled' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-light dark:text-muted-dark font-mono text-xs">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setModalUser(user)}
                          className="p-1.5 rounded-md hover:bg-border-light dark:hover:bg-border-dark text-muted-light dark:text-muted-dark transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteId(user.id)}
                          className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-light dark:text-muted-dark hover:text-rose-500 transition-colors"
                          title="Delete"
                          disabled={user.id === currentUser?.id}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-light dark:text-muted-dark">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalUser && (
        <UserModal
          user={typeof modalUser === 'object' ? modalUser : null}
          onClose={() => setModalUser(null)}
          onSave={handleSave}
        />
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete User"
          message="This action cannot be undone. The user and their data will be permanently removed."
          isDestructive
          onConfirm={() => { deleteMut.mutate(deleteId); setDeleteId(null); }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
