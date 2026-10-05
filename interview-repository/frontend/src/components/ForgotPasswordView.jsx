import { useState } from 'react';
import { Mail, ArrowLeft, Send, CheckCircle2, ShieldAlert } from 'lucide-react';
import { getSupabaseClient, getStoredConfig } from '../lib/supabaseClient';

export const ForgotPasswordView = ({
  onBackToSignIn,
  onShowToast,
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    const config = getStoredConfig();
    if (!config.isConfigured) {
      setErrorMsg('Authentication service is currently unavailable. Please try again later.');
      onShowToast('error', 'Authentication service is currently unavailable. Please try again later.', 'Service Unavailable');
      return;
    }

    setLoading(true);
    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setErrorMsg(error.message);
        onShowToast('error', error.message, 'Reset Failed');
      } else {
        setSubmitted(true);
        onShowToast(
          'success',
          'Password reset instructions have been sent to your email.',
          'Email Sent'
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-card">
      <button
        type="button"
        className="back-nav-btn"
        onClick={onBackToSignIn}
        aria-label="Back to Sign In"
      >
        <ArrowLeft size={16} />
        <span>Back to Sign In</span>
      </button>

      <div className="auth-header">
        <h2 className="auth-heading">Reset your password</h2>
        <p className="auth-subheading">
          Enter the email address associated with your account and we'll send you a recovery link.
        </p>
      </div>

      {submitted ? (
        <div className="reset-success-box">
          <div className="success-icon-badge">
            <CheckCircle2 size={32} className="text-emerald" />
          </div>
          <h3 className="success-heading">Check your inbox</h3>
          <p className="success-message">
            We sent a password reset link to <strong>{email}</strong>. Follow the instructions to choose a new password.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-block mt-4"
            onClick={onBackToSignIn}
          >
            Return to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleReset} className="auth-form" noValidate>
          {errorMsg && (
            <div className="auth-alert auth-alert-danger" role="alert">
              <ShieldAlert size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="form-group">
            <label className="field-label" htmlFor="reset-email">
              Email Address
            </label>
            <div className="input-affix-wrapper">
              <Mail className="input-affix-icon" size={17} />
              <input
                id="reset-email"
                type="email"
                className="text-input has-prefix"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-loading-content">
                <span className="spin-dot" />
                Sending Recovery Link...
              </span>
            ) : (
              <span className="btn-content">
                <Send size={16} />
                Send Reset Link
              </span>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
