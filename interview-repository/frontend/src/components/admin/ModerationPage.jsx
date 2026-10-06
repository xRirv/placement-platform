import { useState, useEffect } from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import './AdminStyles.css';

export const ModerationPage = ({ user, session, userProfile }) => {
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [activeTab, setActiveTab] = useState('high');
  const [loading, setLoading] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/admin/management/moderation-logs?size=100`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.content || []);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (activeTab === 'high') return log.action?.includes('HIGH') || log.entityType === 'HIGH_RISK';
    if (activeTab === 'medium')
      return log.action?.includes('MEDIUM') || log.entityType === 'MEDIUM_RISK';
    return true;
  });

  const handleApprove = async () => {
    if (!selectedLog) return;
    try {
      const res = await fetch(
        `${backendUrl}/api/admin/management/moderation-logs/${selectedLog.id}/review`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'APPROVED',
            notes: resolutionNote,
          }),
        }
      );
      if (res.ok) {
        setSelectedLog(null);
        setResolutionNote('');
        fetchLogs();
      }
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleReject = async () => {
    if (!selectedLog) return;
    try {
      const res = await fetch(
        `${backendUrl}/api/admin/management/moderation-logs/${selectedLog.id}/review`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'REJECTED',
            notes: resolutionNote,
          }),
        }
      );
      if (res.ok) {
        setSelectedLog(null);
        setResolutionNote('');
        fetchLogs();
      }
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  if (selectedLog) {
    return (
      <AdminLayout user={user} userProfile={userProfile}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <button
            onClick={() => setSelectedLog(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              color: '#64748b',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              marginBottom: '1.5rem',
            }}
          >
            <ArrowLeft size={16} />
            Back to Logs
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
            {/* Left Panel */}
            <div>
              <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ padding: '1.5rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '1rem',
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                      Moderation Log Detail
                    </h3>
                    <span className="admin-status-badge high-risk">HIGH RISK</span>
                  </div>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: '#64748b',
                      margin: '0 0 1.5rem 0',
                    }}
                  >
                    Log ID: {selectedLog.id?.substring(0, 8)} • {new Date(selectedLog.createdAt).toLocaleDateString()}
                  </p>

                  <div
                    style={{
                      padding: '1rem',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      marginBottom: '1.5rem',
                    }}
                  >
                    <h4
                      style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        textTransform: 'uppercase',
                        margin: '0 0 0.75rem 0',
                        fontWeight: 600,
                      }}
                    >
                      Candidate
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <img
                        src={`https://ui-avatars.com/api/?name=Student&background=4F46E5&color=fff`}
                        alt="Student"
                        style={{ width: '48px', height: '48px', borderRadius: '50%' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>Student Name</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          STU-{new Date().getFullYear()}-001
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Session Type:</span>{' '}
                      <span style={{ fontWeight: 500 }}>Technical Mock Round 2</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Duration:</span>{' '}
                      <span style={{ fontWeight: 500 }}>45 Minutes</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Interviewer:</span>{' '}
                      <span style={{ fontWeight: 500 }}>AI Agent Beta-4</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-card">
                <div style={{ padding: '1.5rem' }}>
                  <h4
                    style={{
                      fontSize: '0.75rem',
                      color: '#64748b',
                      textTransform: 'uppercase',
                      margin: '0 0 1rem 0',
                      fontWeight: 600,
                    }}
                  >
                    Take Action
                  </h4>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      marginBottom: '0.5rem',
                    }}
                  >
                    Resolution Note
                  </label>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Reason for your decision..."
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      minHeight: '100px',
                      resize: 'vertical',
                      marginBottom: '1rem',
                    }}
                  />
                  <button
                    onClick={handleApprove}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#4F46E5',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginBottom: '0.75rem',
                    }}
                  >
                    Approve Experience
                  </button>
                  <button
                    onClick={handleReject}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'white',
                      color: '#ef4444',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Reject Experience
                  </button>
                </div>
              </div>
            </div>

            {/* Right Panel */}
            <div>
              <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
                    Incident Analysis
                  </h3>

                  <div
                    style={{
                      padding: '1rem',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <AlertTriangle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
                      <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#991b1b' }}>
                          Response Latency Spike
                        </h4>
                        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', color: '#450a0a' }}>
                          The system detected that for questions labeled as "Complex" (e.g., Dynamic
                          Programming), the candidate began typing comprehensive solutions within 0.4
                          seconds of the question being displayed.
                        </p>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#dc2626',
                          }}
                        >
                          CONFIDENCE SCORE: 98% Match for AI Copy-Paste
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '1rem',
                      background: '#fff7ed',
                      border: '1px solid #fed7aa',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <AlertTriangle size={20} style={{ color: '#f97316', flexShrink: 0 }} />
                      <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#9a3412' }}>
                          Gaze Tracking Anomaly
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#7c2d12' }}>
                          During the 15-20 minute mark, the candidate's gaze was tracked to be
                          off-screen for 70% of the duration while simultaneously producing 40 lines of
                          error-free code.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
                    Transcript Snippet
                  </h3>
                  <div
                    style={{
                      padding: '1rem',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ color: '#2563eb' }}>[00:15:22] INTERVIEWER:</span> How would you
                      optimize the current knapsack solution for space?
                    </div>
                    <div>
                      <span style={{ color: '#16a34a' }}>[00:15:23] CANDIDATE:</span> To optimize for
                      space, we can use a 1D array instead of a 2D table because the current row only
                      depends on the previous row. Specifically, dp[w] = max(dp[w], dp[w - weight[i]] +
                      value[i])...
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-card">
                <div style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
                    Historical Context
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                    This candidate has 0 previous moderation flags across 4 prior sessions.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>Session #3 (Passed)</div>
                      <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                        LOW RISK
                      </div>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>Session #2 (Passed)</div>
                      <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                        LOW RISK
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout user={user} userProfile={userProfile}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div className="admin-page-header">
          <h1 className="admin-page-title">Moderation Logs</h1>
          <p className="admin-page-subtitle">
            Review interview experiences marked as Medium or High Risk.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          {/* Left: Logs List */}
          <div>
            <div className="admin-tabs">
              <button
                className={`admin-tab ${activeTab === 'high' ? 'active' : ''}`}
                onClick={() => setActiveTab('high')}
              >
                High Risk ({filteredLogs.filter((l) => activeTab === 'high').length || 12})
              </button>
              <button
                className={`admin-tab ${activeTab === 'medium' ? 'active' : ''}`}
                onClick={() => setActiveTab('medium')}
              >
                Medium Risk ({filteredLogs.filter((l) => activeTab === 'medium').length || 8})
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {loading ? (
                <div className="admin-empty-state">Loading...</div>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderLeft: '4px solid #ef4444',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img
                          src={`https://ui-avatars.com/api/?name=Student&background=4F46E5&color=fff`}
                          alt="Student"
                          style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {log.entityType || 'Student Name'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            STU-{new Date().getFullYear()}-{String(Math.floor(Math.random() * 999)).padStart(3, '0')}
                          </div>
                        </div>
                      </div>
                      <span className="admin-status-badge high-risk">HIGH RISK</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0 0 0.5rem 0' }}>
                      {log.reason || 'Inconsistent responses detected in technical assessment'}
                    </p>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Reported {new Date(log.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="admin-empty-state">No moderation logs found.</div>
              )}
            </div>
          </div>

          {/* Right: Empty State */}
          <div
            style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '3rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              textAlign: 'center',
              color: '#94a3b8',
              minHeight: '400px',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                background: '#f8fafc',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <AlertTriangle size={32} style={{ color: '#cbd5e1' }} />
            </div>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>
              Select a moderation log to take action
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
