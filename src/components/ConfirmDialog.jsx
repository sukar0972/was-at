import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog({ title, message, onConfirm, onCancel, isDestructive = false }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6 max-w-sm w-full shadow-xl">
        <div className="flex items-start gap-3 mb-4">
          {isDestructive && <AlertTriangle size={20} className="text-rose-500 mt-0.5 flex-shrink-0" />}
          <div>
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-sm text-muted-light dark:text-muted-dark mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-border-light dark:border-border-dark hover:bg-border-light dark:hover:bg-border-dark transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
              isDestructive
                ? 'bg-rose-500 hover:bg-rose-600'
                : 'bg-primary hover:bg-primary-dark'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
