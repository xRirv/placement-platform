import { useState } from 'react';
import {
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { calculatePasswordStrength } from '../lib/passwordStrength';
import { getSupabaseClient, getStoredConfig } from '../lib/supabaseClient';

export const AuthCard = ({
  mode,
  onModeChange,
  onShowToast,
  onLoginSuccess,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const [errors, setErrors] = useState({});

  const isSignUp = mode === 'signup';
  const strength = calculatePasswordStrength(password);
  const config = getStoredConfig();

  const validate = () => {
    const newErrors = {};

    if (isSignUp && !fullName.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (isSignUp && password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (isSignUp && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (!config.isConfigured) {
      setErrors({
        general: 'Authentication service is currently unavailable. Please try again later.',
      });
      onShowToast(
        'error',
        'Authentication service is currently unavailable. Please try again later.',
        'Service Unavailable'
      );
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const client = getSupabaseClient();

      if (isSignUp) {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              name: fullName.trim(),
            },
          },
        });

        if (error) {
          setErrors({ general: error.message });
          onShowToast('error', error.message, 'Signup Error');
        } else if (data.user && !data.session) {
          onShowToast(
            'success',
            'Account created! Check your email inbox to confirm your address before logging in.',
            'Verification Required'
          );
          onModeChange('signin');
        } else {
          onShowToast('success', `Welcome to InterviewRepo, ${fullName}!`, 'Account Created');
          if (onLoginSuccess && data.session) {
            onLoginSuccess(data.session);
          }
        }
      } else {
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setErrors({ general: error.message });
          onShowToast('error', error.message, 'Sign In Error');
        } else {
          onShowToast('success', 'Authenticated successfully! Loading your session...', 'Welcome Back');
          if (onLoginSuccess && data?.session) {
            onLoginSuccess(data.session);
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected connection error occurred.';
      setErrors({ general: message });
      onShowToast('error', message, 'Connection Error');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    setOauthLoading(provider);
    setErrors({});
    try {
      const client = getSupabaseClient();
      const redirectUrl = `${window.location.origin}/login`;
      console.log(`[OAuth] Initiating ${provider} login with redirectTo: ${redirectUrl}`);

      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error(`[OAuth] ${provider} error:`, error);
        setErrors({ general: error.message });
        onShowToast('error', error.message, 'OAuth Error');
        setOauthLoading(null);
      } else if (data?.url) {
        console.log(`[OAuth] Redirecting to URL:`, data.url);
        window.location.href = data.url;
      } else {
        setOauthLoading(null);
      }
    } catch (err) {
      console.error(`[OAuth] Exception during ${provider} login:`, err);
      const message = err instanceof Error ? err.message : 'OAuth initialization failed';
      setErrors({ general: message });
      onShowToast('error', message, 'OAuth Error');
      setOauthLoading(null);
    }
  };

  return (
    <div className="auth-card-wrap">
      {/* Mode Switcher Segmented Tabs */}
      <div className="auth-tabs" role="tablist" aria-label="Authentication Mode">
        <button
          type="button"
          role="tab"
          aria-selected={!isSignUp}
          className={`auth-tab ${!isSignUp ? 'active' : ''}`}
          onClick={() => {
            onModeChange('signin');
            setErrors({});
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isSignUp}
          className={`auth-tab ${isSignUp ? 'active' : ''}`}
          onClick={() => {
            onModeChange('signup');
            setErrors({});
          }}
        >
          Create Account
        </button>
      </div>

      {/* Card Header */}
      <div className="auth-header">
        <h2 className="auth-heading">
          {isSignUp ? 'Join InterviewRepo' : 'Welcome back'}
        </h2>
        <p className="auth-subheading">
          {isSignUp
            ? 'Create an account to browse interview questions and contribute verified peer insights.'
            : 'Enter your email and password to access your interview workspace and insights.'}
        </p>
      </div>

      {/* Social Login Buttons */}
      <div className="social-auth-grid">
        <button
          type="button"
          className="btn-social"
          onClick={() => handleOAuthLogin('google')}
          disabled={Boolean(oauthLoading) || loading}
          aria-label="Continue with Google"
        >
          <svg className="social-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{oauthLoading === 'google' ? 'Redirecting to Google...' : 'Google'}</span>
        </button>

        <button
          type="button"
          className="btn-social"
          onClick={() => handleOAuthLogin('github')}
          disabled={Boolean(oauthLoading) || loading}
          aria-label="Continue with GitHub"
        >
          <svg className="social-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            />
          </svg>
          <span>{oauthLoading === 'github' ? 'Connecting...' : 'GitHub'}</span>
        </button>
      </div>

      <div className="auth-divider">
        <span>or continue with email</span>
      </div>

      {/* Global Form Error Alert */}
      {errors.general && (
        <div className="auth-alert auth-alert-danger animate-shake" role="alert">
          <AlertCircle size={16} />
          <span>{errors.general}</span>
        </div>
      )}

      {/* Main Authentication Form */}
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {isSignUp && (
          <div className="form-group animate-slide-down">
            <label className="field-label" htmlFor="full-name">
              Full Name
            </label>
            <div className={`input-affix-wrapper ${errors.name ? 'has-error' : ''}`}>
              <UserIcon className="input-affix-icon" size={17} />
              <input
                id="full-name"
                type="text"
                className="text-input has-prefix"
                placeholder="Alex Morgan"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                autoComplete="name"
              />
            </div>
            {errors.name && <span className="field-error-text">{errors.name}</span>}
          </div>
        )}

        <div className="form-group">
          <label className="field-label" htmlFor="email-input">
            Email Address
          </label>
          <div className={`input-affix-wrapper ${errors.email ? 'has-error' : ''}`}>
            <Mail className="input-affix-icon" size={17} />
            <input
              id="email-input"
              type="email"
              className="text-input has-prefix"
              placeholder="alex@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              autoComplete="email"
            />
          </div>
          {errors.email && <span className="field-error-text">{errors.email}</span>}
        </div>

        <div className="form-group">
          <div className="field-label-row">
            <label className="field-label" htmlFor="password-input">
              Password
            </label>
            {!isSignUp && (
              <button
                type="button"
                className="forgot-link"
                onClick={() => onModeChange('forgot')}
              >
                Forgot password?
              </button>
            )}
          </div>
          <div className={`input-affix-wrapper ${errors.password ? 'has-error' : ''}`}>
            <Lock className="input-affix-icon" size={17} />
            <input
              id="password-input"
              type={showPassword ? 'text' : 'password'}
              className="text-input has-prefix has-suffix"
              placeholder={isSignUp ? 'Create a secure password' : '••••••••••••'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
            <button
              type="button"
              className="input-affix-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <span className="field-error-text">{errors.password}</span>}

          {/* Dynamic Password Strength Indicator (Sign Up Mode) */}
          {isSignUp && password.length > 0 && (
            <div className="password-strength-box animate-fade-in">
              <div className="strength-header">
                <span className="strength-label">Password strength:</span>
                <span className="strength-score" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
              <div className="strength-meter-bar">
                <div
                  className="strength-meter-fill"
                  style={{
                    width: `${(strength.score / 4) * 100}%`,
                    backgroundColor: strength.color,
                  }}
                />
              </div>

              <div className="strength-criteria-grid">
                <div className={`criteria-item ${strength.hasMinLength ? 'met' : ''}`}>
                  <span className="criteria-bullet" />
                  <span>8+ characters</span>
                </div>
                <div className={`criteria-item ${strength.hasUppercase ? 'met' : ''}`}>
                  <span className="criteria-bullet" />
                  <span>Uppercase</span>
                </div>
                <div className={`criteria-item ${strength.hasNumber ? 'met' : ''}`}>
                  <span className="criteria-bullet" />
                  <span>Number</span>
                </div>
                <div className={`criteria-item ${strength.hasSpecial ? 'met' : ''}`}>
                  <span className="criteria-bullet" />
                  <span>Special char</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {isSignUp && (
          <div className="form-group animate-slide-down">
            <label className="field-label" htmlFor="confirm-password-input">
              Confirm Password
            </label>
            <div className={`input-affix-wrapper ${errors.confirmPassword ? 'has-error' : ''}`}>
              <Lock className="input-affix-icon" size={17} />
              <input
                id="confirm-password-input"
                type={showConfirmPassword ? 'text' : 'password'}
                className="text-input has-prefix has-suffix"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword)
                    setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="input-affix-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="field-error-text">{errors.confirmPassword}</span>
            )}
          </div>
        )}

        {/* Remember me & Terms */}
        <div className="form-options-row">
          <label className="custom-checkbox-label">
            <input
              type="checkbox"
              className="custom-checkbox-input"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span className="custom-checkbox-box">
              <CheckCircle2 size={13} className="custom-check-icon" />
            </span>
            <span className="custom-checkbox-text">
              {isSignUp ? 'I agree to the Terms of Service & Privacy Policy' : 'Keep me signed in'}
            </span>
          </label>
        </div>

        {/* Primary CTA Submit Button */}
        <button
          type="submit"
          className="btn btn-primary btn-block btn-lg submit-btn"
          disabled={loading}
        >
          {loading ? (
            <span className="btn-loading-content">
              <span className="spin-dot" />
              {isSignUp ? 'Creating Account...' : 'Signing in...'}
            </span>
          ) : (
            <span className="btn-content">
              <span>{isSignUp ? 'Create Free Account' : 'Sign In to Workspace'}</span>
              <ArrowRight size={17} className="btn-arrow" />
            </span>
          )}
        </button>
      </form>

      {/* Switch Mode Footer */}
      <div className="auth-card-footer">
        {isSignUp ? (
          <p>
            Already have an account?{' '}
            <button
              type="button"
              className="inline-action-link"
              onClick={() => {
                onModeChange('signin');
                setErrors({});
              }}
            >
              Sign in here
            </button>
          </p>
        ) : (
          <p>
            Don't have an account yet?{' '}
            <button
              type="button"
              className="inline-action-link"
              onClick={() => {
                onModeChange('signup');
                setErrors({});
              }}
            >
              Create free account
            </button>
          </p>
        )}
      </div>
    </div>
  );
};
