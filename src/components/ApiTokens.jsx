import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTokens, createToken, deleteToken } from '../api/client';
import { Key, Copy, Check, Plus, Trash2, AlertCircle } from 'lucide-react';

export function ApiTokens() {
  const queryClient = useQueryClient();
  const [newToken, setNewToken] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const { data: tokens = [] } = useQuery({
    queryKey: ['tokens'],
    queryFn: fetchTokens,
  });

  const createMut = useMutation({
    mutationFn: () => createToken('iOS Shortcut'),
    onSuccess: (data) => {
      setNewToken(data);
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteToken,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tokens'] }),
  });

  const copyToken = (token) => {
    navigator.clipboard.writeText(token);
    setCopiedId('new');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyCurl = (token) => {
    const cmd = `curl -X POST https://your-domain.com/api/visits \\\n  -H "Authorization: Bearer ${token}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"location_id": "YOUR_LOCATION_ID", "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}'`;
    navigator.clipboard.writeText(cmd);
    setCopiedId('curl');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Key size={18} className="text-primary" />
          API Tokens
        </h3>
        <button
          onClick={() => { setNewToken(null); createMut.mutate(); }}
          disabled={createMut.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-60 transition-colors"
        >
          <Plus size={14} />
          New token
        </button>
      </div>

      <p className="text-sm text-muted-light dark:text-muted-dark">
        Use these tokens in your iOS Shortcuts automation to log visits automatically.
      </p>

      {newToken && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 animate-fade-in">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <strong>Copy this token now.</strong> You will not be able to see it again.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-md bg-bg-light dark:bg-bg-dark font-mono text-xs break-all">
              {newToken.token}
            </code>
            <button
              onClick={() => copyToken(newToken.token)}
              className="p-2 rounded-md border border-border-light dark:border-border-dark hover:bg-border-light dark:hover:bg-border-dark transition-colors"
            >
              {copiedId === 'new' ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
            </button>
          </div>
          <button
            onClick={() => copyCurl(newToken.token)}
            className="mt-2 text-xs text-primary hover:underline"
          >
            {copiedId === 'curl' ? 'Copied cURL!' : 'Copy example cURL command'}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {tokens.map(t => (
          <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
            <div>
              <div className="font-medium text-sm">{t.name}</div>
              <div className="text-xs text-muted-light dark:text-muted-dark font-mono">
                {t.last_used_at ? `Last used: ${new Date(t.last_used_at).toLocaleDateString()}` : 'Never used'}
              </div>
            </div>
            <button
              onClick={() => deleteMut.mutate(t.id)}
              className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-light dark:text-muted-dark hover:text-rose-500 transition-colors"
              title="Revoke token"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {tokens.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-light dark:text-muted-dark">
            No tokens yet. Create one to use with iOS Shortcuts.
          </div>
        )}
      </div>
    </div>
  );
}
