import { Navigate } from 'react-router-dom';

export const ProtectedRoute = ({
  user,
  userProfile,
  initializing,
  allowedRoles = [],
  children,
}) => {
  if (initializing) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          background: '#f8fafc',
        }}
      >
        <span className="spin-dot" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
        <span style={{ fontSize: '0.95rem', color: '#64748b' }}>Authenticating session...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = userProfile?.role ? userProfile.role.toUpperCase() : 'STUDENT';

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Redirect user to their own role page
    const roleRoutes = {
      ADMIN: '/admin',
      STUDENT: '/student',
      MENTOR: '/mentor',
      ALUMNI: '/alumni',
    };
    return <Navigate to={roleRoutes[role] || '/student'} replace />;
  }

  return children;
};
