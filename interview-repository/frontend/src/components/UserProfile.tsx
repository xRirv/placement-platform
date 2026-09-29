import { useState } from 'react';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import {
  LogOut,
  Mail,
  ShieldCheck,
  Calendar,
  Key,
  Copy,
  Check,
  Server,
  RefreshCw,
} from 'lucide-react';
import { syncUserWithBackend } from '../lib/supabaseClient';

interface UserProfileProps {
  user: SupabaseUser;
  session: Session | null;
  onSignOut: () => Promise<void>;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

interface SyncResponse {
  authUserId?: string;
  id?: string;
  role?: string;
  active?: boolean;
  error?: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  session,
  onSignOut,
  onShowToast,
}) => {
  const [copiedToken, setCopiedToken] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Authenticated User';

  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const initials = fullName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleCopyToken = () => {
    if (!session?.access_token) return;
    navigator.clipboard.writeText(session.access_token);
    setCopiedToken(true);
    onShowToast('info', 'Bearer JWT token copied to clipboard', 'Copied');
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleBackendSync = async () => {
    if (!session?.access_token) {
      onShowToast('error', 'No active session access token found.');
      return;
    }
    setSyncing(true);
    setSyncResult(null);

    const res = await syncUserWithBackend(session.access_token, fullName);
    setSyncing(false);

    if (res.success) {
      setSyncResult((res.data as SyncResponse) ?? null);
      onShowToast(
        'success',
        `Synced with Spring Boot backend! Role: ${(res.data?.role as string) || 'STUDENT'}`,
        'Sync Successful'
      );
    } else {
      setSyncResult({ error: res.error });
      onShowToast(
        'info',
        `${res.error} (Ensure Spring Boot backend is running on :8080)`,
        'Backend Notice'
      );
    }
  };

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await onSignOut();
      onShowToast('info', 'You have been signed out safely.', 'Signed Out');
    } finally {
      setSigningOut(false);
    }
  };

  const formattedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recent';

  const provider = user.app_metadata?.provider || 'email';

  return (
    <div className="profile-card">
      <div className="profile-banner">
        <div className="profile-avatar-wrap">
          {avatarUrl ? (
            <img src={avatarUrl} alt={fullName} className="profile-avatar-img" />
          ) : (
            <div className="profile-avatar-placeholder">{initials}</div>
          )}
          <span className="profile-online-indicator" title="Active session" />
        </div>
      </div>

      <div className="profile-body">
        <div className="profile-identity">
          <h2 className="profile-name">{fullName}</h2>
          <div className="profile-email-badge">
            <Mail size={13} />
            <span>{user.email}</span>
            {user.email_confirmed_at && (
              <span className="verified-pill" title="Email Verified">
                Verified
              </span>
            )}
          </div>
        </div>

        {/* User Info Stats Grid */}
        <div className="profile-stats-grid">
          <div className="stat-box">
            <div className="stat-label">
              <ShieldCheck size={13} /> Auth Provider
            </div>
            <div className="stat-value capitalize">{provider}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">
              <Calendar size={13} /> Member Since
            </div>
            <div className="stat-value">{formattedDate}</div>
          </div>
        </div>

        {/* Backend Synchronization Section */}
        <div className="backend-sync-box">
          <div className="backend-sync-header">
            <div className="backend-sync-title">
              <Server size={16} className="text-accent" />
              <span>Spring Boot Backend Sync</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={handleBackendSync}
              disabled={syncing}
            >
              {syncing ? <RefreshCw size={12} className="spin" /> : <RefreshCw size={12} />}
              <span>{syncing ? 'Syncing...' : 'Sync /api/auth/sync'}</span>
            </button>
          </div>
          <p className="backend-sync-desc">
            Sends your Supabase JWT to Spring Boot's OAuth2 Resource Server to sync your profile into the PostgreSQL database.
          </p>

          {syncResult && (
            <div
              className={`sync-result-box ${
                syncResult.error ? 'sync-result-err' : 'sync-result-ok'
              }`}
            >
              {syncResult.error ? (
                <div>{syncResult.error}</div>
              ) : (
                <div className="sync-details">
                  <div className="sync-detail-row">
                    <span>User ID:</span> <code>{syncResult.authUserId || syncResult.id}</code>
                  </div>
                  <div className="sync-detail-row">
                    <span>Assigned Role:</span> <span className="role-tag">{syncResult.role}</span>
                  </div>
                  <div className="sync-detail-row">
                    <span>Active Status:</span>{' '}
                    <span className="text-emerald font-semibold">
                      {syncResult.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* JWT Access Token Inspector */}
        <div className="token-inspector-box">
          <div className="token-inspector-header">
            <div className="token-inspector-title">
              <Key size={14} />
              <span>Supabase Access Token (JWT)</span>
            </div>
            <div className="token-inspector-actions">
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? 'Hide' : 'Inspect'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={handleCopyToken}
                title="Copy JWT token"
              >
                {copiedToken ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
                <span>{copiedToken ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {showToken && (
            <div className="token-preview">
              <code>{session?.access_token || 'No token found in current session'}</code>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="profile-actions">
          <button
            type="button"
            className="btn btn-danger-outline btn-block"
            onClick={handleLogout}
            disabled={signingOut}
          >
            {signingOut ? <RefreshCw size={16} className="spin" /> : <LogOut size={16} />}
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
