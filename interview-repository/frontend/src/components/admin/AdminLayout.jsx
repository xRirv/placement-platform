import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import './AdminStyles.css';

export const AdminLayout = ({ children, user, userProfile }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard' },
    { path: '/admin/students', label: 'Students' },
    { path: '/admin/mentors', label: 'Mentors' },
    { path: '/admin/alumni', label: 'Alumni' },
    { path: '/admin/moderation', label: 'Moderation' },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      // Force navigation even if there's an error
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="admin-header-left">
          <h1 className="admin-logo">INTERVIEW REPO</h1>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`admin-nav-item ${isActive(item.path) ? 'active' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="admin-header-right">
          <div className="admin-user-info">
            <img
              src={userProfile?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.user_metadata?.name || user?.email || 'User')}&background=4F46E5&color=fff`}
              alt={user?.user_metadata?.name || user?.email}
              className="admin-user-avatar"
            />
            <div className="admin-user-details">
              <span className="admin-user-name">{user?.user_metadata?.name || user?.email}</span>
              <span className="admin-user-role">Administrator</span>
            </div>
          </div>
          <button className="admin-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="admin-content">{children}</main>
    </div>
  );
};
