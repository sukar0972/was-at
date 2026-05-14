export function StatCard({ label, value, icon: Icon, change }) {
  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-light dark:text-muted-dark uppercase tracking-wider">{label}</span>
        {Icon && <Icon size={16} className="text-muted-light dark:text-muted-dark" />}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold font-mono">{value}</span>
        {change !== undefined && (
          <span className={`text-xs font-medium ${change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {change >= 0 ? '+' : ''}{change}
          </span>
        )}
      </div>
    </div>
  );
}
