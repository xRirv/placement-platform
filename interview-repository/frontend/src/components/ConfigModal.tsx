import React, { useState } from 'react';
import { Settings, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { getStoredConfig, saveCustomConfig, resetToEnvConfig, getSupabaseClient } from '../lib/supabaseClient';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, onConfigChanged }) => {
  const currentConfig = getStoredConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({
        success: false,
        message: 'Both Supabase URL and Anon Key are required.',
      });
      return;
    }
    saveCustomConfig(url, anonKey);
    setTestResult({
      success: true,
      message: 'Supabase configuration saved! Client re-initialized.',
    });
    onConfigChanged();
  };

  const handleReset = () => {
    resetToEnvConfig();
    const refreshed = getStoredConfig();
    setUrl(refreshed.url);
    setAnonKey(refreshed.anonKey);
    setTestResult({
      success: true,
      message: 'Reset back to environment file (.env) values.',
    });
    onConfigChanged();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.getSession();
      if (error) {
        setTestResult({
          success: false,
          message: `Connection error: ${error.message}`,
        });
      } else {
        setTestResult({
          success: true,
          message: 'Connection verified! Supabase Auth endpoint is reachable and responsive.',
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown network error';
      setTestResult({
        success: false,
        message: `Connection failed: ${message}`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge">
              <Settings size={18} />
            </div>
            <div>
              <h3 className="modal-title">Supabase Auth Configuration</h3>
              <p className="modal-subtitle">Connect your live Supabase project instance</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close configuration">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-body">
          <div className="info-banner">
            <ShieldCheck size={16} className="text-accent" />
            <span>
              Credentials can be found in your{' '}
              <a
                href="https://supabase.com/dashboard/project/_/settings/api"
                target="_blank"
                rel="noreferrer"
                className="inline-link"
              >
                Supabase Dashboard &gt; Project Settings &gt; API <ExternalLink size={12} />
              </a>
              .
            </span>
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="supabase-url">
              Project URL <span className="req">*</span>
            </label>
            <input
              id="supabase-url"
              type="text"
              className="text-input font-mono"
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="supabase-anon-key">
              Anon Public API Key <span className="req">*</span>
            </label>
            <textarea
              id="supabase-anon-key"
              rows={3}
              className="text-input font-mono"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              required
            />
            <span className="field-hint">
              This is safe for browser use (anon/public key). Never use the service_role secret key in the browser.
            </span>
          </div>

          {testResult && (
            <div className={`status-pill ${testResult.success ? 'status-pill-success' : 'status-pill-danger'}`}>
              {testResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="modal-footer">
            <div className="modal-footer-left">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing ? <RefreshCw size={14} className="spin" /> : <RefreshCw size={14} />}
                <span>Test Connection</span>
              </button>
              {currentConfig.isCustom && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleReset}
                  title="Reset to .env file configuration"
                >
                  Reset to .env
                </button>
              )}
            </div>

            <div className="modal-footer-right">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save & Apply
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
