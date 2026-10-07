import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  BookOpen,
  HelpCircle,
  Send,
  ListChecks,
  Sparkles,
  UserRound,
  Building2,
  GraduationCap,
  LogOut,
  Menu,
  X,
  Compass,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { ErrorBoundary, CompanyAvatar } from '../ui/ui';
import { useStudentData } from './StudentData';
import { useChat } from './ChatQueue';

const NAV = [
  {
    label: 'Workspace',
    items: [
      { to: '/student', label: 'Overview', icon: LayoutGrid, end: true },
      { to: '/student/experiences', label: 'Interview Experiences', icon: BookOpen, count: 'experiences' },
      { to: '/student/questions', label: 'Question Bank', icon: HelpCircle },
      { to: '/student/submissions', label: 'My Submissions', icon: Send, count: 'submissions' },
    ],
  },
  {
    label: 'Preparation',
    items: [
      { to: '/student/plan', label: 'Study Plan', icon: ListChecks },
      { to: '/student/assistant', label: 'AI Assistant', icon: Sparkles, count: 'chat' },
      { to: '/student/profile', label: 'Candidate Profile', icon: UserRound },
    ],
  },
  {
    label: 'Career',
    items: [
      { to: '/student/companies', label: 'Target Companies', icon: Building2 },
      { to: '/student/mentor', label: 'My Mentor', icon: GraduationCap },
    ],
  },
];

const THEMES = [
  { value: 'system', label: 'Auto', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

const readTheme = () => {
  try {
    return localStorage.getItem('ws-theme') || 'system';
  } catch {
    return 'system';
  }
};

export const StudentShell = ({ user, userProfile }) => {
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState(readTheme);
  const chooseTheme = (value) => {
    setTheme(value);
    try {
      localStorage.setItem('ws-theme', value);
    } catch {
      // ignore (private mode)
    }
  };
  const location = useLocation();
  const navigate = useNavigate();
  const data = useStudentData();
  const chat = useChat();

  // Close the mobile drawer whenever the route changes.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setNavOpen(false);
  }

  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setNavOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  const handleSignOut = async () => {
    try {
      await getSupabaseClient().auth.signOut();
    } finally {
      navigate('/login');
    }
  };

  const name = data.profile.data?.name || userProfile?.name || user?.email?.split('@')[0] || 'Student';
  const counts = {
    experiences: data.experiences.data?.length,
    submissions: data.submissions.data?.length,
    // Unread AI replies (or a working indicator) while you're on another page.
    chat: chat.unread ? `${chat.unread} new` : chat.pending ? '…' : null,
  };

  return (
    <div className={`ws ws-shell ${navOpen ? 'nav-open' : ''}`} data-theme={theme}>
      <aside className="ws-sidebar" id="ws-sidebar" aria-label="Main navigation">
        <NavLink to="/student" end className="ws-brand">
          <span className="ws-brand-mark">
            <Compass size={17} aria-hidden="true" />
          </span>
          <span>InterviewRepo</span>
        </NavLink>

        <nav className="ws-nav">
          {NAV.map((group) => (
            <div className="ws-nav-group" key={group.label}>
              <div className="ws-nav-label">{group.label}</div>
              {group.items.map(({ to, label, icon: Icon, end, count }) => (
                <NavLink key={to} to={to} end={end} className="ws-nav-link">
                  <Icon size={17} aria-hidden="true" />
                  <span>{label}</span>
                  {count && counts[count] != null && (
                    <span className={`ws-nav-count ${count === 'chat' ? 'ws-nav-count-accent' : ''}`}>
                      {counts[count]}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="ws-theme-toggle" role="group" aria-label="Color theme">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={() => chooseTheme(value)}
              title={`${label} theme`}
            >
              <Icon size={13} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>

        <div className="ws-sidebar-footer">
          <CompanyAvatar name={name} size={34} />
          <div className="ws-user-meta">
            <div className="ws-user-name">{name}</div>
            <div className="ws-user-email">{user?.email}</div>
          </div>
          <button
            type="button"
            className="ws-btn ws-btn-ghost ws-btn-icon ws-signout"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={17} aria-hidden="true" />
          </button>
        </div>
      </aside>

      <div className="ws-scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />

      <div className="ws-main">
        <header className="ws-topbar">
          <button
            type="button"
            className="ws-btn ws-btn-ghost ws-btn-icon"
            onClick={() => setNavOpen((o) => !o)}
            aria-label={navOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={navOpen}
            aria-controls="ws-sidebar"
          >
            {navOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span style={{ fontWeight: 700 }}>InterviewRepo</span>
          <CompanyAvatar name={name} size={30} />
        </header>

        <main className="ws-content" key={location.pathname}>
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
