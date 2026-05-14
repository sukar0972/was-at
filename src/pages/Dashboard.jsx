import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchLocations, createLocation, updateLocation, deleteLocation, fetchVisitStats, fetchVisits } from '../api/client';
import { StatCard } from '../components/StatCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  CalendarDays, MapPin, TrendingUp, Flame, Copy, Check, Plus, Pencil, Trash2,
  ChevronLeft, ChevronRight, X, PanelLeftClose, PanelLeft, Clock
} from 'lucide-react';

function CalendarYear({ currentDate, stats, onSelectMonth }) {
  const year = currentDate.getFullYear();
  const months = [];
  for (let m = 0; m < 12; m++) {
    const firstDay = new Date(year, m, 1);
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const startDayOfWeek = firstDay.getDay();
    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    months.push({ name: firstDay.toLocaleString('default', { month: 'short' }), days });
  }

  const maxCount = Math.max(1, ...Object.values(stats || {}));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {months.map((month, mi) => (
        <button
          key={mi}
          onClick={() => onSelectMonth(mi)}
          className="text-left p-3 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark hover:border-primary/40 transition-colors"
        >
          <div className="text-sm font-medium mb-2">{month.name}</div>
          <div className="grid grid-cols-7 gap-1">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="text-[10px] text-center text-muted-light dark:text-muted-dark">{d}</div>
            ))}
            {month.days.map((day, di) => {
              if (!day) return <div key={di} />;
              const dateKey = `${year}-${String(mi + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const count = stats?.[dateKey] || 0;
              const intensity = count > 0 ? Math.max(0.15, count / maxCount) : 0;
              return (
                <div
                  key={di}
                  className="aspect-square rounded-sm text-[10px] flex items-center justify-center transition-colors"
                  style={count > 0 ? {
                    background: `color-mix(in oklch, var(--color-primary) ${intensity * 100}%, transparent)`,
                    color: intensity > 0.5 ? 'white' : undefined
                  } : {}}
                  title={count > 0 ? `${dateKey}: ${count} visits` : dateKey}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </button>
      ))}
    </div>
  );
}

function CalendarMonth({ currentDate, stats, onSelectDay, onPrev, onNext, onToday }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = firstDay.getDay();
  const days = [];
  for (let i = 0; i < startDayOfWeek; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  const maxCount = Math.max(1, ...Object.values(stats || {}));
  const today = new Date();
  const isTodayMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onPrev} className="p-1.5 rounded-lg hover:bg-border-light dark:hover:bg-border-dark transition-colors"><ChevronLeft size={18} /></button>
          <h3 className="text-lg font-semibold min-w-[140px] text-center">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <button onClick={onNext} className="p-1.5 rounded-lg hover:bg-border-light dark:hover:bg-border-dark transition-colors"><ChevronRight size={18} /></button>
        </div>
        <button onClick={onToday} className="px-3 py-1.5 text-sm rounded-lg border border-border-light dark:border-border-dark hover:bg-border-light dark:hover:bg-border-dark transition-colors">
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="text-xs font-medium text-center text-muted-light dark:text-muted-dark py-1">{d}</div>
        ))}
        {days.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const count = stats?.[dateKey] || 0;
          const intensity = count > 0 ? Math.max(0.15, count / maxCount) : 0;
          const isTodayCell = isTodayMonth && day === today.getDate();
          return (
            <button
              key={i}
              onClick={() => onSelectDay(day)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-colors relative ${
                isTodayCell ? 'ring-2 ring-primary' : ''
              }`}
              style={count > 0 ? {
                background: `color-mix(in oklch, var(--color-primary) ${intensity * 100}%, var(--color-surface-light))`,
              } : { background: 'var(--color-surface-light)' }}
              aria-label={`${dateKey}, ${count} visits`}
            >
              <span className={isTodayCell ? 'font-bold text-primary' : ''}>{day}</span>
              {count > 0 && <span className="text-[10px] leading-none font-mono opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalendarWeek({ currentDate, stats, onPrev, onNext }) {
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push(d);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onPrev} className="p-1.5 rounded-lg hover:bg-border-light dark:hover:bg-border-dark transition-colors"><ChevronLeft size={18} /></button>
          <h3 className="text-lg font-semibold">
            {days[0].toLocaleDateString('default', { month: 'short', day: 'numeric' })} – {days[6].toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
          </h3>
          <button onClick={onNext} className="p-1.5 rounded-lg hover:bg-border-light dark:hover:bg-border-dark transition-colors"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="space-y-2">
        {days.map((day, i) => {
          const dateKey = day.toISOString().split('T')[0];
          const count = stats?.[dateKey] || 0;
          return (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
              <div className="w-12 text-center">
                <div className="text-xs text-muted-light dark:text-muted-dark uppercase">{day.toLocaleDateString('default', { weekday: 'short' })}</div>
                <div className="text-lg font-semibold">{day.getDate()}</div>
              </div>
              <div className="flex-1">
                {count > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-sm">{count} visit{count !== 1 ? 's' : ''}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-light dark:text-muted-dark">No visits</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VisitDetailModal({ date, visits, onClose }) {
  const dayVisits = visits.filter(v => v.timestamp.startsWith(date));
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 max-w-md w-full shadow-xl animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{new Date(date).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-border-light dark:hover:bg-border-dark transition-colors"><X size={18} /></button>
        </div>
        {dayVisits.length === 0 ? (
          <p className="text-muted-light dark:text-muted-dark text-sm">No visits recorded for this day.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {dayVisits.map(v => (
              <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border border-border-light dark:border-border-dark">
                <Clock size={16} className="text-muted-light dark:text-muted-dark flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">{v.location_name}</div>
                  <div className="text-xs text-muted-light dark:text-muted-dark font-mono">{new Date(v.timestamp).toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LocationsPanel({ open, onClose }) {
  const queryClient = useQueryClient();
  const { data: locations = [] } = useQuery({ queryKey: ['locations'], queryFn: fetchLocations });
  const [isEditing, setIsEditing] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', lat: '', lng: '', radius: '' });
  const [copiedId, setCopiedId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const createMut = useMutation({
    mutationFn: createLocation,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['locations'] }); setForm({ name: '', address: '', lat: '', lng: '', radius: '' }); setIsEditing(null); }
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateLocation(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['locations'] }); setIsEditing(null); }
  });

  const deleteMut = useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['locations'] }); setDeleteId(null); }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      name: form.name,
      address: form.address,
      lat: parseFloat(form.lat) || 0,
      lng: parseFloat(form.lng) || 0,
      radius: parseInt(form.radius) || 100,
    };
    if (isEditing && isEditing !== 'new') {
      updateMut.mutate({ id: isEditing, data });
    } else {
      createMut.mutate(data);
    }
  };

  const copyShortcut = (loc) => {
    navigator.clipboard.writeText(loc.id).then(() => {
      setCopiedId(loc.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const startEdit = (loc) => {
    setIsEditing(loc.id);
    setForm({ name: loc.name, address: loc.address, lat: String(loc.lat), lng: String(loc.lng), radius: String(loc.radius) });
  };

  const panelContent = (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark">
        <h2 className="font-semibold flex items-center gap-2">
          <MapPin size={18} className="text-primary" />
          Locations
        </h2>
        <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-border-light dark:hover:bg-border-dark"><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {locations.map(loc => (
          <div key={loc.id} className="p-3 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="font-medium text-sm">{loc.name}</div>
                <div className="text-xs text-muted-light dark:text-muted-dark">{loc.address}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(loc)} className="p-1.5 rounded-md hover:bg-border-light dark:hover:bg-border-dark text-muted-light dark:text-muted-dark"><Pencil size={14} /></button>
                <button onClick={() => setDeleteId(loc.id)} className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-light dark:text-muted-dark hover:text-rose-500"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-mono text-muted-light dark:text-muted-dark">{loc.visit_count} visits</span>
              <button
                onClick={() => copyShortcut(loc)}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border-light dark:border-border-dark hover:bg-border-light dark:hover:bg-border-dark transition-colors"
              >
                {copiedId === loc.id ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                {copiedId === loc.id ? 'Copied!' : 'Copy ID'}
              </button>
            </div>
          </div>
        ))}

        {/* Add/Edit form */}
        {(isEditing === 'new' || isEditing) && (
          <form onSubmit={handleSubmit} className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2 animate-fade-in">
            <div className="text-sm font-medium mb-1">{isEditing === 'new' ? 'Add Location' : 'Edit Location'}</div>
            <input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-2.5 py-1.5 text-sm rounded-md border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark focus:outline-none focus:ring-1 focus:ring-primary" required />
            <input placeholder="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full px-2.5 py-1.5 text-sm rounded-md border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark focus:outline-none focus:ring-1 focus:ring-primary" />
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="Lat" value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} className="px-2.5 py-1.5 text-sm rounded-md border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark focus:outline-none focus:ring-1 focus:ring-primary" />
              <input placeholder="Lng" value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} className="px-2.5 py-1.5 text-sm rounded-md border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark focus:outline-none focus:ring-1 focus:ring-primary" />
              <input placeholder="Radius" value={form.radius} onChange={e => setForm(f => ({ ...f, radius: e.target.value }))} className="px-2.5 py-1.5 text-sm rounded-md border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 py-1.5 text-sm rounded-md bg-primary text-white font-medium hover:bg-primary-dark transition-colors">
                {createMut.isPending || updateMut.isPending ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={() => { setIsEditing(null); setForm({ name: '', address: '', lat: '', lng: '', radius: '' }); }} className="px-3 py-1.5 text-sm rounded-md border border-border-light dark:border-border-dark hover:bg-border-light dark:hover:bg-border-dark transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}

        {!isEditing && (
          <button
            onClick={() => { setIsEditing('new'); setForm({ name: '', address: '', lat: '', lng: '', radius: '' }); }}
            className="w-full py-2 rounded-lg border border-dashed border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:text-primary hover:border-primary/40 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus size={16} />
            Add location
          </button>
        )}
      </div>

      {deleteId && (
        <ConfirmDialog
          title="Delete Location"
          message="Are you sure? This will also remove associated visit history."
          isDestructive
          onConfirm={() => deleteMut.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );

  return (
    <>
      {/* Mobile drawer */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onClose} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-bg-light dark:bg-bg-dark border-l border-border-light dark:border-border-dark lg:hidden animate-slide-up">
            {panelContent}
          </div>
        </>
      )}
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-80 border-l border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark flex-shrink-0">
        {panelContent}
      </div>
    </>
  );
}

export function Dashboard() {
  const [viewMode, setViewMode] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [locationsOpen, setLocationsOpen] = useState(false);

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['stats', viewMode, currentDate.toISOString().slice(0, 10)],
    queryFn: () => fetchVisitStats({ viewMode, currentDate }),
    staleTime: 30000,
  });

  const { data: dayVisits = [] } = useQuery({
    queryKey: ['visits', selectedDay],
    queryFn: () => fetchVisits({ start: selectedDay, end: selectedDay }),
    enabled: !!selectedDay,
  });

  const stats = statsData?.summary;
  const visitStats = statsData?.stats || {};

  const navigateMonth = (dir) => {
    const d = new Date(currentDate);
    if (viewMode === 'year') d.setFullYear(d.getFullYear() + dir);
    else if (viewMode === 'month') d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const selectMonth = (monthIndex) => {
    const d = new Date(currentDate);
    d.setMonth(monthIndex);
    setCurrentDate(d);
    setViewMode('month');
  };

  const selectDay = (day) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDay(d.toISOString().split('T')[0]);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Stats bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 animate-pulse">
                <div className="h-3 w-16 bg-border-light dark:bg-border-dark rounded mb-3" />
                <div className="h-7 w-12 bg-border-light dark:bg-border-dark rounded" />
              </div>
            ))
          ) : (
            <>
              <StatCard label="This Week" value={stats?.thisWeek ?? '—'} icon={CalendarDays} />
              <StatCard label="Current Streak" value={stats?.currentStreak ? `${stats.currentStreak} wks` : '—'} icon={Flame} />
              <StatCard label="Most Visited" value={stats?.mostVisited ?? '—'} icon={MapPin} />
              <StatCard label="Weekly Avg" value={stats?.weeklyAverage ?? '—'} icon={TrendingUp} />
            </>
          )}
        </div>

        {/* Calendar controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
            {['year', 'month', 'week'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  viewMode === mode
                    ? 'bg-primary text-white'
                    : 'text-muted-light dark:text-muted-dark hover:text-fg-light dark:hover:text-fg-dark'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <button
            onClick={() => setLocationsOpen(!locationsOpen)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border-light dark:border-border-dark hover:bg-border-light dark:hover:bg-border-dark transition-colors"
          >
            {locationsOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
            Locations
          </button>
        </div>

        {/* Calendar */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 lg:p-6">
          {viewMode === 'year' && (
            <CalendarYear currentDate={currentDate} stats={visitStats} onSelectMonth={selectMonth} />
          )}
          {viewMode === 'month' && (
            <CalendarMonth
              currentDate={currentDate}
              stats={visitStats}
              onSelectDay={selectDay}
              onPrev={() => navigateMonth(-1)}
              onNext={() => navigateMonth(1)}
              onToday={goToday}
            />
          )}
          {viewMode === 'week' && (
            <CalendarWeek
              currentDate={currentDate}
              stats={visitStats}
              onPrev={() => navigateMonth(-1)}
              onNext={() => navigateMonth(1)}
            />
          )}
        </div>
      </div>

      {/* Locations panel */}
      <LocationsPanel open={locationsOpen} onClose={() => setLocationsOpen(false)} />

      {/* Day detail modal */}
      {selectedDay && (
        <VisitDetailModal
          date={selectedDay}
          visits={dayVisits}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}
