import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMe, updateProfile } from '../api/client';
import { ApiTokens } from '../components/ApiTokens';
import { Loader2, User, KeyRound, Save, AlertCircle, CheckCircle } from 'lucide-react';

export function Profile() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({ queryKey: ['me'], queryFn: fetchMe });

  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) setDisplayName(user.display_name || '');
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setIsSaving(true);
    try {
      const payload = { display_name: displayName };
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }
      await updateProfile(payload);
      setMessage({ type: 'success', text: 'Profile updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <Loader2 size={24} className="animate-spin mx-auto text-muted-light dark:text-muted-dark" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-semibold flex items-center gap-2">
        <User size={24} />
        Profile
      </h1>

      {message && (
        <div className={`p-3 rounded-lg flex items-center gap-2 text-sm animate-fade-in ${
          message.type === 'error'
            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
        }`}>
          {message.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {message.text}
        </div>
      )}

      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 space-y-4">
        <h2 className="font-medium">Account Details</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Username</label>
            <input
              value={user?.username || ''}
              disabled
              className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-border-light/30 dark:bg-border-dark/30 text-muted-light dark:text-muted-dark cursor-not-allowed"
            />
            <p className="text-xs text-muted-light dark:text-muted-dark mt-1">Username cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Display Name</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
            />
          </div>

          <div className="border-t border-border-light dark:border-border-dark pt-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
              <KeyRound size={14} />
              Change Password
            </h3>
            <div className="space-y-3">
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              />
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
          >
            {isSaving && <Loader2 size={16} className="animate-spin" />}
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5">
        <ApiTokens />
      </div>
    </div>
  );
}
