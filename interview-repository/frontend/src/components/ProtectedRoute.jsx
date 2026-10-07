import { Navigate } from 'react-router-dom';

const ROLE_ROUTES = {
  ADMIN: '/admin/dashboard',
  STUDENT: '/student',
  MENTOR: '/mentor',
  ALUMNI: '/alumni',
};

const centered = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1rem',
  padding: '1.5rem',
  textAlign: 'center',
  background: '#f8fafc',
};

/** Pull a readable message out of "Backend status 403: {json}" style errors. */
const readableError = (error) => {
  if (!error) return 'We could not load your account.';
  const json = error.indexOf('{');
  if (json >= 0) {
    try {
      const parsed = JSON.parse(error.slice(json));
      if (parsed?.message) return parsed.message;
    } catch {
      // fall through
    }
  }
  return error;
};

/**
 * Shown while a signed-in user's role is loading, or if it could not be loaded.
 * Role-based redirects wait for this, so nobody is briefly sent to the wrong dashboard.
 */
export const ProfileGate = ({ profileError, onRetry, onSignOut }) => {
  if (!profileError) {
    return (
      <div style={centered}>
        <span className="spin-dot" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
        <span style={{ fontSize: '0.95rem', color: '#64748b' }}>Loading your workspace...</span>
      </div>
    );
  }
  return (
    <div style={centered} role="alert">
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>We couldn't open your account</h1>
      <p style={{ color: '#475569', maxWidth: 440, margin: 0 }}>{readableError(profileError)}</p>
      <div style={{ display: 'flex', gap: '0.6rem' }}>
        {onRetry && (
          <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={onRetry}>
            Try again
          </button>
        )}
        {onSignOut && (
          <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={onSignOut}>
            Sign out
          </button>
        )}
      </div>
    </div>
  );
};

export const ProtectedRoute = ({
  user,
  userProfile,
  initializing,
  profileError,
  onRetryProfile,
  onSignOut,
  allowedRoles = [],
  children,
}) => {
  if (initializing) {
    return (
      <div style={centered}>
        <span className="spin-dot" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
        <span style={{ fontSize: '0.95rem', color: '#64748b' }}>Authenticating session...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Wait for the real role instead of assuming STUDENT.
  if (!userProfile?.role) {
    return <ProfileGate profileError={profileError} onRetry={onRetryProfile} onSignOut={onSignOut} />;
  }

  const role = userProfile.role.toUpperCase();
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={ROLE_ROUTES[role] || '/login'} replace />;
  }

  return children;
};
