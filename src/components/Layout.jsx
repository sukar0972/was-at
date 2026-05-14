import { useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { MapPin, LayoutDashboard, Users, LogOut, Moon, Sun, Menu, X, User } from 'lucide-react';

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-fg-light dark:text-fg-dark hover:bg-border-light dark:hover:bg-border-dark transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/profile', label: 'Profile', icon: User },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: Users }] : []),
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark text-fg-light dark:text-fg-dark flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-border-light dark:border-border-dark bg-bg-light/85 dark:bg-bg-dark/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
            <MapPin size={22} className="text-primary" />
            Visit Tracker
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.to)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-light dark:text-muted-dark hover:text-fg-light dark:hover:text-fg-dark hover:bg-border-light dark:hover:bg-border-dark'
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg border border-border-light dark:border-border-dark"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <button
              onClick={logout}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-light dark:text-muted-dark hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut size={16} />
              Log out
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border-light dark:border-border-dark px-4 py-2 animate-fade-in">
            <div className="flex flex-col gap-1">
              {navItems.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    isActive(item.to)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-light dark:text-muted-dark'
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              ))}
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-light dark:text-muted-dark hover:text-rose-500"
              >
                <LogOut size={16} />
                Log out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
