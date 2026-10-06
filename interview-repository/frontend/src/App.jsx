import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { getSupabaseClient, fetchCurrentUserProfile } from './lib/supabaseClient';
import { AuthPage } from './components/AuthPage';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { MentorDashboard } from './components/MentorDashboard';
import { AlumniDashboard } from './components/AlumniDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastContainer } from './components/Toast';
import { DashboardPage } from './components/admin/DashboardPage';
import { StudentsPage } from './components/admin/StudentsPage';
import { MentorsPage } from './components/admin/MentorsPage';
import { AlumniPage } from './components/admin/AlumniPage';
import { ModerationPage } from './components/admin/ModerationPage';
import './components/Auth.css';

function AppContent() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [toasts, setToasts] = useState([]);
  const navigate = useNavigate();

  const showToast = useCallback((type, message, title) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadUserProfile = async (token) => {
    if (!token) return;
    const res = await fetchCurrentUserProfile(token);
    if (res.success && res.data) {
      setUserProfile(res.data);
      return res.data;
    }
    return null;
  };

  const getRoleDestination = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'MENTOR':
        return '/mentor';
      case 'ALUMNI':
        return '/alumni';
      case 'STUDENT':
      default:
        return '/student';
    }
  };

  useEffect(() => {
    let unsubscribeFn = null;
    try {
      const client = getSupabaseClient();

      client.auth.getSession().then(async ({ data: { session }, error }) => {
        if (!error && session) {
          setSession(session);
          setUser(session.user);
          const profile = await loadUserProfile(session.access_token);
          if (profile?.role) {
            const currentPath = window.location.pathname;
            if (currentPath === '/' || currentPath === '/login') {
              navigate(getRoleDestination(profile.role), { replace: true });
            }
          }
        } else {
          setSession(null);
          setUser(null);
          setUserProfile(null);
        }
        setInitializing(false);
      });

      const {
        data: { subscription },
      } = client.auth.onAuthStateChange(async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session) {
          const profile = await loadUserProfile(session.access_token);
          if (profile?.role) {
            // Auto-redirect to appropriate role page if currently at root or login
            const currentPath = window.location.pathname;
            if (currentPath === '/' || currentPath === '/login') {
              navigate(getRoleDestination(profile.role), { replace: true });
            }
          }
        } else {
          setUserProfile(null);
        }
        setInitializing(false);
      });

      unsubscribeFn = () => subscription.unsubscribe();
    } catch {
      queueMicrotask(() => {
        setInitializing(false);
      });
    }

    return () => {
      if (unsubscribeFn) unsubscribeFn();
    };
  }, [navigate]);

  const handleLoginSuccess = async (newSession) => {
    if (!newSession?.access_token) return;
    const profile = await loadUserProfile(newSession.access_token);
    const dest = getRoleDestination(profile?.role || 'STUDENT');
    navigate(dest, { replace: true });
  };

  const currentRole = userProfile?.role?.toUpperCase() || 'STUDENT';

  return (
    <>
      <Routes>
        {/* Public Login Route */}
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={getRoleDestination(currentRole)} replace />
            ) : (
              <AuthPage
                onShowToast={showToast}
                onLoginSuccess={handleLoginSuccess}
              />
            )
          }
        />

        {/* Root Route: Redirect based on authentication status */}
        <Route
          path="/"
          element={
            user ? (
              <Navigate to={getRoleDestination(currentRole)} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Role-Based Protected Routes */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute
              user={user}
              userProfile={userProfile}
              initializing={initializing}
              allowedRoles={['ADMIN']}
            >
              <DashboardPage
                user={user}
                session={session}
                userProfile={userProfile}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/students"
          element={
            <ProtectedRoute
              user={user}
              userProfile={userProfile}
              initializing={initializing}
              allowedRoles={['ADMIN']}
            >
              <StudentsPage
                user={user}
                session={session}
                userProfile={userProfile}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/mentors"
          element={
            <ProtectedRoute
              user={user}
              userProfile={userProfile}
              initializing={initializing}
              allowedRoles={['ADMIN']}
            >
              <MentorsPage
                user={user}
                session={session}
                userProfile={userProfile}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/alumni"
          element={
            <ProtectedRoute
              user={user}
              userProfile={userProfile}
              initializing={initializing}
              allowedRoles={['ADMIN']}
            >
              <AlumniPage
                user={user}
                session={session}
                userProfile={userProfile}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/moderation"
          element={
            <ProtectedRoute
              user={user}
              userProfile={userProfile}
              initializing={initializing}
              allowedRoles={['ADMIN']}
            >
              <ModerationPage
                user={user}
                session={session}
                userProfile={userProfile}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student"
          element={
            <ProtectedRoute
              user={user}
              userProfile={userProfile}
              initializing={initializing}
              allowedRoles={['STUDENT']}
            >
              <StudentDashboard
                user={user}
                session={session}
                userProfile={userProfile}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mentor"
          element={
            <ProtectedRoute
              user={user}
              userProfile={userProfile}
              initializing={initializing}
              allowedRoles={['MENTOR']}
            >
              <MentorDashboard
                user={user}
                session={session}
                userProfile={userProfile}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/alumni"
          element={
            <ProtectedRoute
              user={user}
              userProfile={userProfile}
              initializing={initializing}
              allowedRoles={['ALUMNI']}
            >
              <AlumniDashboard
                user={user}
                session={session}
                userProfile={userProfile}
              />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
