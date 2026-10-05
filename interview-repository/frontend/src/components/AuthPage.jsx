import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { ShowcasePanel } from './ShowcasePanel';
import { AuthCard } from './AuthCard';
import { ForgotPasswordView } from './ForgotPasswordView';

export const AuthPage = ({
  onShowToast,
  onLoginSuccess,
}) => {
  const [authMode, setAuthMode] = useState('signin');

  return (
    <div className="auth-page-root">
      {/* Top Application Bar */}
      <header className="auth-nav">
        <a href="/" className="auth-nav-logo">
          <div className="logo-badge">
            <Sparkles size={19} />
          </div>
          <span className="logo-text">
            Interview<span className="logo-accent">Repo</span>
          </span>
        </a>

        <div className="nav-actions">
          <div className="nav-badge-verified">
            <span className="status-dot-pulse" aria-hidden="true" />
            <span className="nav-badge-text">Verified Community</span>
          </div>
        </div>
      </header>

      {/* Main Split Authentication Screen */}
      <main className="auth-main-layout">
        <ShowcasePanel />

        <section className="auth-form-column" aria-label="Authentication Form">
          {authMode === 'forgot' ? (
            <div className="auth-card-wrap">
              <ForgotPasswordView
                onBackToSignIn={() => setAuthMode('signin')}
                onShowToast={onShowToast}
              />
            </div>
          ) : (
            <AuthCard
              mode={authMode}
              onModeChange={setAuthMode}
              onShowToast={onShowToast}
              onLoginSuccess={onLoginSuccess}
            />
          )}
        </section>
      </main>
    </div>
  );
};
