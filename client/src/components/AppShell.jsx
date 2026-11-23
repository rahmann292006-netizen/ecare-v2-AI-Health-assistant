import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen, Terminal, Sparkles, MessagesSquare, Brain, BarChart3, Settings, Menu, X,
  LogOut, Sun, Moon, MonitorSmartphone, Search, ChevronRight, User, CalendarDays, Bell, Trophy,
} from 'lucide-react';
import { useAuth, useTheme } from '../lib/auth.jsx';
import { get } from '../lib/api.js';

const NAV = [
  { group: 'Learn', items: [
    { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { to: '/courses', label: 'Courses', icon: BookOpen },
    { to: '/lab', label: 'Coding lab', icon: Terminal },
    { to: '/tutor', label: 'AI tutor', icon: Sparkles },
  ] },
  { group: 'Prepare', items: [
    { to: '/plan', label: 'My plan', icon: CalendarDays },
    { to: '/aptitude', label: 'Aptitude', icon: Brain },
    { to: '/events', label: 'Events', icon: Trophy },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  ] },
  { group: 'Community', items: [
    { to: '/community', label: 'Discussions', icon: MessagesSquare },
  ] },
];

/* ── toasts ── */
const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, tone = 'default') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone === 'success' ? 'toast--success' : t.tone === 'danger' ? 'toast--danger' : ''}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ── theme switch ── */
export function ThemeSwitch({ compact = false }) {
  const { preference, setTheme } = useTheme();
  const options = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: MonitorSmartphone },
  ];
  return (
    <div className="row" role="group" aria-label="Colour theme" style={{ gap: 4, border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 2, background: 'var(--surface)' }}>
      {options.map((o) => {
        const Icon = o.icon;
        const active = preference === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => setTheme(o.id)}
            aria-pressed={active}
            title={o.label}
            className="btn btn--ghost btn--sm"
            style={active ? { background: 'var(--bg-subtle)', color: 'var(--text)' } : undefined}
          >
            <Icon aria-hidden="true" />
            {!compact && <span>{o.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ── avatar ── */
export function Avatar({ name, color = 'amber', size }) {
  const initials = String(name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <span className={`avatar avatar--${color} ${size === 'lg' ? 'avatar--lg' : ''}`} aria-hidden="true">
      {initials || '?'}
    </span>
  );
}

/* ── app shell ── */
/** Bell with a live unread count, polled while the app is open. */
function NotificationBell() {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let alive = true;
    const tick = () => {
      get('/notifications/unread-count')
        .then((d) => { if (alive) setUnread(d.unread || 0); })
        .catch(() => { /* signed out or offline — keep the last count */ });
    };
    tick();
    const timer = setInterval(tick, 90_000);
    return () => { alive = false; clearInterval(timer); };
  }, []);
  return (
    <Link to="/notifications" className="btn btn--ghost btn--sm" title={unread ? `${unread} unread` : 'Notifications'} aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} style={{ position: 'relative' }}>
      <Bell aria-hidden="true" />
      {unread > 0 && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', top: 2, right: 2, minWidth: 14, height: 14, borderRadius: 7,
            background: 'var(--accent)', color: '#fff', fontSize: 9, lineHeight: '14px', textAlign: 'center', padding: '0 3px',
          }}
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}

export function AppShell({ children, title }) {
  const { profile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef(null);

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        navigate('/courses');
        setTimeout(() => document.getElementById('course-search')?.focus(), 60);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`} aria-label="Main navigation">
        <div className="sidebar__brand">
          <Link to="/dashboard" className="row" style={{ gap: 10 }}>
            <span className="brand-mark">L</span>
            <span className="brand-name">Lumen</span>
          </Link>
          <button className="btn btn--ghost btn--icon nav-toggle" style={{ marginLeft: 'auto' }} onClick={() => setOpen(false)} aria-label="Close navigation">
            <X />
          </button>
        </div>

        {NAV.map((section) => (
          <div className="sidebar__group" key={section.group}>
            <div className="sidebar__label">{section.group}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
                >
                  <Icon aria-hidden="true" />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        ))}

        <div className="sidebar__foot">
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
            <Settings aria-hidden="true" />
            Settings
          </NavLink>
          <div className="row" style={{ padding: 'var(--space-2) var(--space-3)', gap: 10 }}>
            <Avatar name={profile?.displayName} color={profile?.avatarColor} />
            <div style={{ minWidth: 0 }}>
              <div className="small strong" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.displayName}</div>
              <div className="tiny muted">Free plan</div>
            </div>
            <button className="btn btn--ghost btn--icon" style={{ marginLeft: 'auto' }} onClick={logout} title="Sign out" aria-label="Sign out">
              <LogOut />
            </button>
          </div>
        </div>
      </aside>

      <div className="shell__main">
        <header className="topbar">
          <button className="btn btn--ghost btn--icon nav-toggle" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu />
          </button>
          <span className="topbar__title">{title}</span>
          <span className="spacer" />
          <button className="btn btn--ghost btn--sm" onClick={() => { navigate('/courses'); setTimeout(() => document.getElementById('course-search')?.focus(), 60); }}>
            <Search aria-hidden="true" />
            <span className="small muted search-label">Search courses</span>
            <kbd className="tiny muted kbd-hint" style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px' }}>⌘K</kbd>
          </button>
          <NotificationBell />
          <ThemeSwitch compact />
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

/* ── shared page bits ── */
export function PageHead({ eyebrow, title, sub, actions }) {
  return (
    <div className="page__head">
      <div>
        {eyebrow && <div className="page__eyebrow">{eyebrow}</div>}
        <h1 className="page__title">{title}</h1>
        {sub && <p className="page__sub">{sub}</p>}
      </div>
      {actions && <div className="row row--wrap">{actions}</div>}
    </div>
  );
}

export function Empty({ icon: Icon = BookOpen, title, children, action }) {
  return (
    <div className="empty">
      <Icon aria-hidden="true" />
      <div className="empty__title">{title}</div>
      {children && <p className="small" style={{ maxWidth: '46ch', margin: '0 auto' }}>{children}</p>}
      {action && <div style={{ marginTop: 'var(--space-4)' }}>{action}</div>}
    </div>
  );
}

export function Loading({ rows = 3, height = 64 }) {
  return (
    <div className="stack stack-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height }} />
      ))}
    </div>
  );
}

export function Progress({ value, large, success, label }) {
  return (
    <div>
      {label && (
        <div className="row row--between" style={{ marginBottom: 6 }}>
          <span className="tiny muted">{label}</span>
          <span className="tiny strong">{Math.round(value)}%</span>
        </div>
      )}
      <div className={`progress ${large ? 'progress--lg' : ''} ${success ? 'progress--success' : ''}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress__bar" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="card">
      <div className="row" style={{ gap: 10 }}>
        <div>
          <div className="strong">Could not load this</div>
          <p className="small muted" style={{ marginTop: 4 }}>{error?.message || 'Something went wrong.'}</p>
        </div>
        {onRetry && (
          <button className="btn btn--sm" onClick={onRetry} style={{ marginLeft: 'auto' }}>Retry</button>
        )}
      </div>
    </div>
  );
}

export { ChevronRight, User };
