import { useState } from 'react';
import { Sparkles, Compass } from 'lucide-react';
import { ShowcasePanel } from './ShowcasePanel';
import { AuthCard } from './AuthCard';
import { ForgotPasswordView } from './ForgotPasswordView';
import { LeavesCanvas } from './LeavesCanvas';
import animeBg from '../assets/anime_tree_meadow.jpg';

export const AuthPage = ({ onShowToast, onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState('signin');

  return (
    <div className="auth-page-root scenery-page-root">
      {/* Living Anime Scenery Background Stage */}
      <div className="scenery-stage" aria-hidden="true">
        {/* Base high-res anime painting */}
        <div
          className="scenery-bg-image"
          style={{ backgroundImage: `url(${animeBg})` }}
        />

        {/* Boy breathing / subtle resting motion layer */}
        <div
          className="scenery-boy-motion-layer"
          style={{ backgroundImage: `url(${animeBg})` }}
        />

        {/* Ambient atmospheric lighting rays & rainbow prism glow */}
        <div className="rainbow-prism-halo" />
        <div className="scenery-soft-vignette" />

        {/* Continuous organic falling & floating leaves canvas */}
        <LeavesCanvas />
      </div>

      {/* Top Application Bar with frosted glass */}
      <header className="auth-nav scenery-nav">
        <a href="/" className="auth-nav-logo">
          <div className="logo-badge">
            <Compass size={18} />
          </div>
          <span className="logo-text">
            Interview<span className="logo-accent">Repo</span>
          </span>
        </a>

        <div className="nav-actions">
          <div className="nav-badge-verified">
            <span className="status-dot-pulse" aria-hidden="true" />
            <span className="nav-badge-text">Verified Community Knowledge</span>
          </div>
        </div>
      </header>

      {/* Main Split Screen */}
      <main className="auth-main-layout scenery-layout">
        {/* Left Side: Minimalist Rocketlane-Style Hero Message */}
        <section className="scenery-left-showcase">
          <ShowcasePanel />
        </section>

        {/* Right Side: The Login Box that Fades and Glides into view */}
        <section className="auth-form-column scenery-form-column" aria-label="Authentication Form">
          <div className="scenery-card-container">
            {authMode === 'forgot' ? (
              <div className="auth-card-wrap scenery-card">
                <ForgotPasswordView
                  onBackToSignIn={() => setAuthMode('signin')}
                  onShowToast={onShowToast}
                />
              </div>
            ) : (
              <div className="scenery-card">
                <AuthCard
                  mode={authMode}
                  onModeChange={setAuthMode}
                  onShowToast={onShowToast}
                  onLoginSuccess={onLoginSuccess}
                />
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
