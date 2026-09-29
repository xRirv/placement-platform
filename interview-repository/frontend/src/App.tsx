import { useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { Sparkles, Settings } from 'lucide-react';
import type { AuthMode, ToastMessage } from './types/auth';
import { getSupabaseClient, getStoredConfig } from './lib/supabaseClient';
import { ShowcasePanel } from './components/ShowcasePanel';
import { AuthCard } from './components/AuthCard';
import { ForgotPasswordView } from './components/ForgotPasswordView';
import { UserProfile } from './components/UserProfile';
import { ConfigModal } from './components/ConfigModal';
import { ToastContainer } from './components/Toast';
import './components/Auth.css';

export function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [configVersion, setConfigVersion] = useState(0);

  const showToast = useCallback(
    (type: 'success' | 'error' | 'info', message: string, title?: string) => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
      setToasts((prev) => [...prev, { id, type, message, title }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleConfigChanged = () => {
    setConfigVersion((v) => v + 1);
  };

  useEffect(() => {
    let unsubscribeFn: (() => void) | null = null;
    try {
      const client = getSupabaseClient();

      client.auth.getSession().then(({ data: { session }, error }) => {
        if (!error && session) {
          setSession(session);
          setUser(session.user);
        } else {
          setSession(null);
          setUser(null);
        }
        setInitializing(false);
      });

      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
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
  }, [configVersion]);

  const handleSignOut = async () => {
    const client = getSupabaseClient();
    await client.auth.signOut();
    setUser(null);
    setSession(null);
    setAuthMode('signin');
  };

  const config = getStoredConfig();

  return (
    <div className="auth-page-root">
      {/* Top Application Bar */}
      <header className="auth-nav">
        <a href="/" className="auth-nav-logo">
          <div className="logo-badge">
            <Sparkles size={20} />
          </div>
          <span className="logo-text">
            Interview<span className="logo-accent">Repo</span>
          </span>
        </a>

        <div className="nav-actions">
          <button
            type="button"
            className="nav-badge-btn"
            onClick={() => setIsConfigModalOpen(true)}
            title="Configure Supabase project URL and anon public key"
          >
            <span
              className={`status-dot ${
                config.isConfigured ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
              style={{
                backgroundColor: config.isConfigured ? '#34d399' : '#fbbf24',
              }}
            />
            <span>{config.isConfigured ? 'Supabase Connected' : 'Setup Supabase'}</span>
            <Settings size={13} />
          </button>
        </div>
      </header>

      {/* Main Split Authentication Screen */}
      <main className="auth-main-layout">
        {/* Left Side: Brand Showcase & Value Proposition */}
        <ShowcasePanel />

        {/* Right Side: Interactive Authentication Box */}
        <section className="auth-form-column" aria-label="Authentication Form">
          {initializing ? (
            <div className="auth-card-wrap text-center" style={{ minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <span className="spin-dot" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Initializing session...
                </span>
              </div>
            </div>
          ) : user ? (
            <UserProfile
              user={user}
              session={session}
              onSignOut={handleSignOut}
              onShowToast={showToast}
            />
          ) : authMode === 'forgot' ? (
            <div className="auth-card-wrap">
              <ForgotPasswordView
                onBackToSignIn={() => setAuthMode('signin')}
                onShowToast={showToast}
              />
            </div>
          ) : (
            <AuthCard
              mode={authMode}
              onModeChange={setAuthMode}
              onOpenConfig={() => setIsConfigModalOpen(true)}
              onShowToast={showToast}
            />
          )}
        </section>
      </main>

      {/* Supabase Configuration Modal */}
      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onConfigChanged={handleConfigChanged}
      />

      {/* Real-time Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

export default App;
