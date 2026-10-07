import { Sparkles, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../lib/supabaseClient';
import './Dashboard.css';

export const DashboardLayout = ({
  roleTitle,
  roleBadgeClass,
  user,
  userProfile,
  children,
}) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      const client = getSupabaseClient();
      await client.auth.signOut();
    } finally {
      navigate('/login');
    }
  };

  const displayName =
    userProfile?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User';

  return (
    <div className="dashboard-root">
      <header className="dashboard-nav">
        <a href="/" className="dashboard-logo">
          <div className="logo-badge">
            <Sparkles size={18} />
          </div>
          <span>
            Interview<span style={{ color: '#DBB0FF' }}>Repo</span>
          </span>
        </a>

        <div className="dashboard-nav-right">
          <span className={`role-badge ${roleBadgeClass}`}>
            {roleTitle}
          </span>
          <div className="user-badge">
            <span>{displayName}</span>
            <span style={{ color: '#6766B7' }}>•</span>
            <span style={{ fontSize: '0.78rem', color: '#C8C7EB' }}>{user?.email}</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleSignOut}
            title="Sign Out"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
};
