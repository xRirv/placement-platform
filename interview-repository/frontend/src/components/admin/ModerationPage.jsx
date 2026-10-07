import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, RefreshCw, ShieldCheck, Clock,
  CheckCircle2, XCircle, FileText, Activity,
  ChevronRight, Building2, User2, Calendar, Star, MessageSquare, Layers,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import './AdminStyles.css';

const ACTION_META = {
  INTERVIEW_APPROVED: { label: 'Approved',       color: '#15803d', bg: 'rgba(21,128,61,.1)',  border: 'rgba(21,128,61,.25)'  },
  INTERVIEW_REJECTED: { label: 'Rejected',        color: '#dc2626', bg: 'rgba(220,38,38,.1)',  border: 'rgba(220,38,38,.25)'  },
  INTERVIEW_PENDING:  { label: 'Set Pending',     color: '#ca8a04', bg: 'rgba(202,138,4,.1)',  border: 'rgba(202,138,4,.25)'  },
  USER_ROLE_CHANGED:  { label: 'Role Changed',    color: '#1d4ed8', bg: 'rgba(29,78,216,.1)',  border: 'rgba(29,78,216,.25)'  },
  USER_DEACTIVATED:   { label: 'Deactivated',     color: '#dc2626', bg: 'rgba(220,38,38,.1)',  border: 'rgba(220,38,38,.25)'  },
  USER_ACTIVATED:     { label: 'Activated',       color: '#15803d', bg: 'rgba(21,128,61,.1)',  border: 'rgba(21,128,61,.25)'  },
  UNASSIGN_MENTOR:    { label: 'Unassign Mentor', color: '#7c3aed', bg: 'rgba(124,58,237,.1)', border: 'rgba(124,58,237,.25)' },
  ASSIGN_MENTOR:      { label: 'Assign Mentor',   color: '#0369a1', bg: 'rgba(3,105,161,.1)',  border: 'rgba(3,105,161,.25)'  },
  CREATE:             { label: 'Create',          color: '#15803d', bg: 'rgba(21,128,61,.1)',  border: 'rgba(21,128,61,.25)'  },
  UPDATE:             { label: 'Update',          color: '#0369a1', bg: 'rgba(3,105,161,.1)',  border: 'rgba(3,105,161,.25)'  },
  DELETE:             { label: 'Delete',          color: '#dc2626', bg: 'rgba(220,38,38,.1)',  border: 'rgba(220,38,38,.25)'  },
};
const DEFAULT_META = { label: null, color: '#64748b', bg: 'rgba(100,116,139,.1)', border: 'rgba(100,116,139,.25)' };
const getMeta = (a) => ACTION_META[a] || DEFAULT_META;
const DIFF_COLOR = { easy: '#15803d', medium: '#ca8a04', hard: '#dc2626' };
const RES_COLOR  = { selected: '#15803d', offered: '#15803d', passed: '#15803d', rejected: '#dc2626', failed: '#dc2626', pending: '#ca8a04' };

const GLOBAL_CSS = `
  @keyframes spin      { to { transform: rotate(360deg); } }
  @keyframes fadeUp    { from { opacity:0;transform:translateY(14px); } to { opacity:1;transform:translateY(0); } }
  @keyframes pulseGlow { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.55;transform:scale(1.45)} }
  .mod-row           { animation: fadeUp .3s ease both; cursor:pointer; }
  .mod-row:hover td  { background: rgba(34,197,94,.04) !important; }
  .back-btn { display:inline-flex;align-items:center;gap:.5rem;padding:.55rem 1.25rem;background:white;border:1.5px solid rgba(139,99,65,.18);border-radius:12px;color:#5a3d1f;font-size:.875rem;font-weight:700;cursor:pointer;margin-bottom:1.75rem;box-shadow:0 2px 8px rgba(95,79,31,.08);transition:background .2s; }
  .back-btn:hover { background:#f0fdf4; }
  .mod-refresh-btn { display:inline-flex;align-items:center;gap:.5rem;padding:.7rem 1.6rem;background:linear-gradient(135deg,#15803d,#22c55e);color:white;border:none;border-radius:12px;font-size:.875rem;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(21,128,61,.35);transition:all .2s; }
  .mod-refresh-btn:hover { transform:translateY(-2px);box-shadow:0 6px 20px rgba(21,128,61,.45); }
  .mod-refresh-btn:disabled { opacity:.65;cursor:not-allowed; }
  .center-loader { display:flex;flex-direction:column;align-items:center;justify-content:center;padding:5rem 2rem;gap:1rem;color:#8b6f5c;font-weight:600; }
  .empty-state { padding:4rem 2rem;text-align:center;color:#a89688; }
  .empty-icon  { width:76px;height:76px;border-radius:20px;background:rgba(139,99,65,.08);display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem; }
  .empty-state h3 { margin:0 0 .5rem;font-weight:800;font-size:1.1rem; }
  .empty-state p  { margin:0;font-size:.875rem;max-width:380px;margin-inline:auto; }
  .icon-btn { display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);color:#15803d;cursor:pointer;transition:all .2s; }
  .icon-btn:hover { background:#15803d;color:white; }
`;

function ActionBadge({ action }) {
  const m = getMeta(action);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '.35rem',
      padding: '.28rem .8rem', background: m.bg, border: `1px solid ${m.border}`,
      borderRadius: 20, color: m.color, fontSize: '.7rem', fontWeight: 700,
      letterSpacing: '.03em', whiteSpace: 'nowrap', textTransform: 'uppercase',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
      {m.label || action}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, gradient }) {
  return (
    <div
      style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,rgba(255,255,255,.97),rgba(250,247,245,.92))', border: '1.5px solid rgba(139,99,65,.1)', borderRadius: 16, padding: '1.2rem 1.5rem', boxShadow: '0 4px 20px rgba(95,79,31,.06)', transition: 'transform .2s,box-shadow .2s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(95,79,31,.13)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(95,79,31,.06)'; }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: gradient, borderRadius: '16px 16px 0 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: '.7rem', fontWeight: 700, color: '#a89688', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</p>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{value}</p>
        </div>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,.18)' }}>
          <Icon size={22} color="white" />
        </div>
      </div>
    </div>
  );
}

function ExperienceCard({ exp, expanded, onToggle, onModerate, moderatingId }) {
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(null);
  const busy = moderatingId === exp.id;
  const diff = (exp.difficulty || 'medium').toLowerCase();
  const diffColor = DIFF_COLOR[diff] || '#64748b';
  const result = (exp.interviewResult || '').toLowerCase();
  const resultColor = Object.entries(RES_COLOR).find(([k]) => result.includes(k))?.[1] || '#64748b';

  const doAction = async (status) => {
    setActing(status);
    await onModerate(exp.id, status, reason);
    setActing(null);
    setReason('');
  };

  return (
    <div
      style={{ borderRadius: 14, border: '1.5px solid rgba(139,99,65,.12)', overflow: 'hidden', background: 'white', boxShadow: '0 2px 12px rgba(95,79,31,.06)', transition: 'box-shadow .2s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 24px rgba(95,79,31,.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(95,79,31,.06)'}
    >
      {/* header row */}
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.5rem', background: 'linear-gradient(135deg,rgba(250,247,245,.7),rgba(240,253,244,.5))', cursor: 'pointer' }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={20} color="white" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.2rem' }}>
              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>{exp.companyName || 'Company'}</span>
              <span style={{ padding: '.18rem .6rem', borderRadius: 20, background: '#fef3c7', color: '#d97706', fontSize: '.68rem', fontWeight: 800, border: '1px solid #fcd34d' }}>PENDING</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '.8rem', color: '#64748b', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}><User2 size={12} />{exp.submitterName || exp.submitterEmail || 'Anonymous'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}><Layers size={12} />{exp.role || '—'}</span>
              {exp.interviewDate && <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}><Calendar size={12} />{exp.interviewDate}</span>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
          <span style={{ padding: '.22rem .7rem', borderRadius: 20, fontSize: '.72rem', fontWeight: 700, background: `${diffColor}18`, border: `1px solid ${diffColor}44`, color: diffColor, textTransform: 'capitalize' }}>
            {exp.difficulty || 'Medium'}
          </span>
          {exp.interviewResult && (
            <span style={{ padding: '.22rem .7rem', borderRadius: 20, fontSize: '.72rem', fontWeight: 700, background: `${resultColor}18`, border: `1px solid ${resultColor}44`, color: resultColor, textTransform: 'capitalize' }}>
              {exp.interviewResult}
            </span>
          )}

          {/* quick action buttons — always visible, don't expand card */}
          <div style={{ display: 'flex', gap: '.5rem' }} onClick={e => e.stopPropagation()}>
            <button
              disabled={busy}
              onClick={() => doAction('APPROVED')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', padding: '.45rem 1rem', borderRadius: 10, background: acting === 'APPROVED' ? '#15803d' : 'rgba(21,128,61,.1)', border: '1.5px solid rgba(21,128,61,.3)', color: acting === 'APPROVED' ? 'white' : '#15803d', fontWeight: 700, fontSize: '.78rem', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.65 : 1, transition: 'all .2s' }}
              onMouseEnter={e => { if (!busy) { e.currentTarget.style.background = '#15803d'; e.currentTarget.style.color = 'white'; } }}
              onMouseLeave={e => { if (!busy && acting !== 'APPROVED') { e.currentTarget.style.background = 'rgba(21,128,61,.1)'; e.currentTarget.style.color = '#15803d'; } }}
            >
              {busy && acting === 'APPROVED' ? <RefreshCw size={13} style={{ animation: 'spin .8s linear infinite' }} /> : <CheckCircle2 size={13} />}
              Approve
            </button>
            <button
              disabled={busy}
              onClick={() => doAction('REJECTED')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', padding: '.45rem 1rem', borderRadius: 10, background: acting === 'REJECTED' ? '#dc2626' : 'rgba(220,38,38,.08)', border: '1.5px solid rgba(220,38,38,.25)', color: acting === 'REJECTED' ? 'white' : '#dc2626', fontWeight: 700, fontSize: '.78rem', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.65 : 1, transition: 'all .2s' }}
              onMouseEnter={e => { if (!busy) { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = 'white'; } }}
              onMouseLeave={e => { if (!busy && acting !== 'REJECTED') { e.currentTarget.style.background = 'rgba(220,38,38,.08)'; e.currentTarget.style.color = '#dc2626'; } }}
            >
              {busy && acting === 'REJECTED' ? <RefreshCw size={13} style={{ animation: 'spin .8s linear infinite' }} /> : <XCircle size={13} />}
              Reject
            </button>
          </div>

          <ChevronRight size={18} color="#a89688" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .25s' }} />
        </div>
      </div>

      {/* expanded detail + reason panel */}
      {expanded && (
        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1.5px solid rgba(139,99,65,.1)', animation: 'fadeUp .25s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              {exp.experience && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.5rem', fontSize: '.72rem', fontWeight: 700, color: '#8b6f5c', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    <FileText size={12} /> Experience
                  </div>
                  <p style={{ margin: 0, fontSize: '.85rem', color: '#334155', lineHeight: 1.65, background: '#f8fafc', padding: '.85rem 1rem', borderRadius: 10, border: '1px solid #f1f5f9', maxHeight: 130, overflowY: 'auto' }}>
                    {exp.experience}
                  </p>
                </div>
              )}
              {exp.tips && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.5rem', fontSize: '.72rem', fontWeight: 700, color: '#8b6f5c', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    <Star size={12} /> Tips
                  </div>
                  <p style={{ margin: 0, fontSize: '.85rem', color: '#334155', lineHeight: 1.65, background: '#f0fdf4', padding: '.85rem 1rem', borderRadius: 10, border: '1px solid rgba(34,197,94,.2)' }}>
                    {exp.tips}
                  </p>
                </div>
              )}
              {!exp.experience && !exp.tips && <p style={{ color: '#94a3b8', fontSize: '.85rem' }}>No additional details provided.</p>}
            </div>

            {/* moderation panel with reason + buttons */}
            <div style={{ padding: '1.25rem', background: 'linear-gradient(135deg,rgba(250,247,245,.8),rgba(240,253,244,.6))', borderRadius: 12, border: '1.5px solid rgba(139,99,65,.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.85rem', fontSize: '.78rem', fontWeight: 700, color: '#5a3d1f', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                <MessageSquare size={14} /> Moderation Reason (optional)
              </div>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Enter reason for your decision..."
                style={{ width: '100%', padding: '.75rem .9rem', border: '1.5px solid rgba(139,99,65,.18)', borderRadius: 10, fontSize: '.84rem', color: '#334155', lineHeight: 1.5, minHeight: 80, resize: 'vertical', fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem', marginTop: '.75rem' }}>
                <button
                  disabled={busy}
                  onClick={() => doAction('APPROVED')}
                  style={{ padding: '.65rem', borderRadius: 10, background: 'linear-gradient(135deg,#15803d,#22c55e)', color: 'white', border: 'none', fontWeight: 800, fontSize: '.84rem', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem', boxShadow: '0 3px 10px rgba(21,128,61,.35)', transition: 'all .2s' }}
                >
                  {busy && acting === 'APPROVED' ? <RefreshCw size={14} style={{ animation: 'spin .8s linear infinite' }} /> : <CheckCircle2 size={14} />}
                  Approve with Reason
                </button>
                <button
                  disabled={busy}
                  onClick={() => doAction('REJECTED')}
                  style={{ padding: '.65rem', borderRadius: 10, background: 'white', color: '#dc2626', border: '2px solid #fca5a5', fontWeight: 800, fontSize: '.84rem', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem', transition: 'all .2s' }}
                >
                  {busy && acting === 'REJECTED' ? <RefreshCw size={14} style={{ animation: 'spin .8s linear infinite' }} /> : <XCircle size={14} />}
                  Reject with Reason
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const ModerationPage = ({ user, session, userProfile }) => {
  const [mainTab,      setMainTab]      = useState('pending');
  const [logTab,       setLogTab]       = useState('all');
  const [pending,      setPending]      = useState([]);
  const [logs,         setLogs]         = useState([]);
  const [loadingP,     setLoadingP]     = useState(false);
  const [loadingL,     setLoadingL]     = useState(false);
  const [error,        setError]        = useState('');
  const [actionMsg,    setActionMsg]    = useState('');
  const [moderatingId, setModeratingId] = useState(null);
  const [expandedId,   setExpandedId]   = useState(null);
  const [selectedLog,  setSelectedLog]  = useState(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
  const flash = (msg) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3500); };

  const fetchPending = useCallback(async () => {
    if (!session?.access_token) return;
    setLoadingP(true);
    try {
      const res = await fetch(`${backendUrl}/api/interviews/moderation?size=50`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) { const d = await res.json(); setPending(d.content || d || []); }
      else setError('Could not load pending interviews.');
    } catch { setError('Network error.'); }
    finally { setLoadingP(false); }
  }, [session?.access_token, backendUrl]);

  const fetchLogs = useCallback(async () => {
    if (!session?.access_token) return;
    setLoadingL(true);
    try {
      const res = await fetch(`${backendUrl}/api/admin/moderation-logs?size=100&sort=createdAt,desc`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) { const d = await res.json(); setLogs(d.content || d || []); }
    } catch { /* ignore */ }
    finally { setLoadingL(false); }
  }, [session?.access_token, backendUrl]);

  useEffect(() => { fetchPending(); fetchLogs(); }, [fetchPending, fetchLogs]);

  const handleModerate = async (id, status, reason) => {
    setModeratingId(id);
    try {
      const res = await fetch(`${backendUrl}/api/interviews/${id}/moderation`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ moderationStatus: status, reason: reason || `Marked ${status} by admin` }),
      });
      if (res.ok) {
        setPending(prev => prev.filter(e => e.id !== id));
        setExpandedId(null);
        flash(`Experience ${status.toLowerCase()} successfully`);
        fetchLogs();
      } else { flash('Action failed — check backend.'); }
    } catch { flash('Network error.'); }
    finally { setModeratingId(null); }
  };

  const isApproval  = l => l.action?.includes('APPROVED') || l.action?.includes('ACTIVATED') || l.action === 'CREATE';
  const isRejection = l => l.action?.includes('REJECTED') || l.action?.includes('DEACTIVATED') || l.action === 'DELETE';
  const logCounts = {
    all:      logs.length,
    approved: logs.filter(isApproval).length,
    rejected: logs.filter(isRejection).length,
    other:    logs.filter(l => !isApproval(l) && !isRejection(l)).length,
  };
  const filteredLogs =
    logTab === 'approved' ? logs.filter(isApproval) :
    logTab === 'rejected' ? logs.filter(isRejection) :
    logTab === 'other'    ? logs.filter(l => !isApproval(l) && !isRejection(l)) : logs;

  if (selectedLog) {
    const m = getMeta(selectedLog.action);
    return (
      <AdminLayout user={user} userProfile={userProfile}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <button className="back-btn" onClick={() => setSelectedLog(null)}>← Back to Logs</button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
            <div className="admin-card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>Log Detail</h3>
                <ActionBadge action={selectedLog.action} />
              </div>
              <p style={{ fontSize: '.75rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
                ID {selectedLog.id?.toString().substring(0, 8)}...<br />
                {selectedLog.createdAt && new Date(selectedLog.createdAt).toLocaleString()}
              </p>
              {[
                { label: 'Admin',       val: selectedLog.adminName || 'System Administrator' },
                { label: 'Entity Type', val: selectedLog.entityType || '—' },
                { label: 'Entity ID',   val: selectedLog.entityId, mono: true },
                { label: 'Reason',      val: selectedLog.reason, accent: true },
              ].filter(f => f.val).map(f => (
                <div key={f.label} style={{ padding: '.8rem 1rem', borderRadius: 10, marginBottom: '.65rem', background: f.accent ? m.bg : '#f8fafc', border: f.accent ? `1px solid ${m.border}` : '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '.67rem', color: f.accent ? m.color : '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '.3rem' }}>{f.label}</div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: f.mono ? '.78rem' : '.875rem', fontFamily: f.mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{f.val}</div>
                </div>
              ))}
            </div>
            <div className="admin-card" style={{ padding: '1.75rem' }}>
              <h3 style={{ fontWeight: 800, color: '#1e293b', marginBottom: '1.25rem' }}>Audit Summary</h3>
              <div style={{ padding: '1.25rem', borderRadius: 12, background: m.bg, border: `1.5px solid ${m.border}`, marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '.75rem', alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ShieldCheck size={20} color="white" />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 .4rem', fontWeight: 800, color: m.color }}>{m.label || selectedLog.action}</h4>
                    <p style={{ margin: 0, fontSize: '.875rem', color: '#475569', lineHeight: 1.6 }}>
                      Action on <strong>{selectedLog.entityType}</strong>{selectedLog.adminName ? ` by ${selectedLog.adminName}` : ''}.
                      {selectedLog.reason ? ` ${selectedLog.reason}` : ''}
                    </p>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                {[
                  { l: 'Action Code', val: selectedLog.action, mono: true },
                  { l: 'Date', val: selectedLog.createdAt ? new Date(selectedLog.createdAt).toLocaleDateString() : '—' },
                  { l: 'Entity', val: selectedLog.entityType || '—' },
                  { l: 'Admin', val: selectedLog.adminName || 'System' },
                ].map(c => (
                  <div key={c.l} style={{ padding: '1rem', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '.67rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '.3rem' }}>{c.l}</div>
                    <div style={{ fontSize: '.85rem', color: '#334155', fontWeight: 700, fontFamily: c.mono ? 'monospace' : 'inherit' }}>{c.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout user={user} userProfile={userProfile}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ maxWidth: 1500, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.5rem' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#15803d,#22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(21,128,61,.35)' }}>
                <ShieldCheck size={22} color="white" />
              </div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', letterSpacing: '-.02em' }}>Content Moderation</h1>
            </div>
            <p style={{ margin: 0, color: '#8b6f5c', fontSize: '.875rem', paddingLeft: '3.5rem' }}>Review pending interviews and track all administrative moderation actions.</p>
          </div>
          <button className="mod-refresh-btn" disabled={loadingP || loadingL} onClick={() => { fetchPending(); fetchLogs(); }}>
            <RefreshCw size={15} style={{ animation: (loadingP || loadingL) ? 'spin .8s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {actionMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.9rem 1.25rem', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, color: '#15803d', marginBottom: '1.25rem', fontWeight: 700, fontSize: '.875rem', animation: 'fadeUp .3s ease' }}>
            <CheckCircle2 size={18} /> {actionMsg}
          </div>
        )}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.9rem 1.25rem', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 12, color: '#dc2626', marginBottom: '1.25rem', fontWeight: 600, fontSize: '.875rem' }}>
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
          <StatCard label="Pending Review"   value={pending.length}     icon={Clock}        gradient="linear-gradient(135deg,#ca8a04,#fbbf24)" />
          <StatCard label="Total Audit Logs" value={logs.length}        icon={Activity}     gradient="linear-gradient(135deg,#4f46e5,#7c3aed)" />
          <StatCard label="Approvals"        value={logCounts.approved} icon={CheckCircle2} gradient="linear-gradient(135deg,#15803d,#22c55e)" />
          <StatCard label="Rejections"       value={logCounts.rejected} icon={XCircle}      gradient="linear-gradient(135deg,#dc2626,#f97316)" />
        </div>

        <div className="admin-card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ display: 'flex', borderBottom: '2px solid rgba(139,99,65,.1)', background: 'rgba(250,247,245,.6)' }}>
            {[
              { key: 'pending', emoji: '⏳', label: 'Pending Review', count: pending.length, urgent: pending.length > 0 },
              { key: 'logs',    emoji: '📋', label: 'Audit Log',       count: logs.length },
            ].map(t => (
              <button key={t.key} onClick={() => setMainTab(t.key)} style={{ padding: '1rem 1.75rem', background: 'none', border: 'none', borderBottom: mainTab === t.key ? '3px solid #22c55e' : '3px solid transparent', color: mainTab === t.key ? '#15803d' : '#8b6f5c', fontWeight: mainTab === t.key ? 800 : 600, fontSize: '.9rem', cursor: 'pointer', transition: 'all .2s', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                {t.emoji} {t.label}
                <span style={{ padding: '.15rem .6rem', borderRadius: 20, fontSize: '.72rem', fontWeight: 800, background: t.urgent ? '#fef3c7' : mainTab === t.key ? 'rgba(34,197,94,.15)' : '#f1f5f9', color: t.urgent ? '#d97706' : mainTab === t.key ? '#15803d' : '#94a3b8', border: t.urgent ? '1px solid #fcd34d' : 'none' }}>{t.count}</span>
              </button>
            ))}
          </div>

          {mainTab === 'pending' && (
            <div style={{ padding: '1.5rem' }}>
              {loadingP ? (
                <div className="center-loader"><RefreshCw size={28} style={{ animation: 'spin .8s linear infinite', color: '#22c55e' }} /><span>Loading pending queue...</span></div>
              ) : pending.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon" style={{ background: 'linear-gradient(135deg,rgba(34,197,94,.15),rgba(21,128,61,.1))' }}><CheckCircle2 size={34} color="#22c55e" /></div>
                  <h3 style={{ color: '#15803d' }}>All caught up!</h3>
                  <p>No interview experiences pending review. Great work keeping up with submissions.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {pending.map(exp => (
                    <ExperienceCard
                      key={exp.id}
                      exp={exp}
                      expanded={expandedId === exp.id}
                      onToggle={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                      onModerate={handleModerate}
                      moderatingId={moderatingId}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {mainTab === 'logs' && (
            <>
              <div style={{ display: 'flex', gap: '.25rem', padding: '.75rem 1.5rem 0', background: 'rgba(250,247,245,.4)', borderBottom: '1px solid rgba(139,99,65,.08)' }}>
                {[
                  { key: 'all',      label: 'All',     count: logCounts.all },
                  { key: 'approved', label: 'Approved', count: logCounts.approved, color: '#15803d' },
                  { key: 'rejected', label: 'Rejected', count: logCounts.rejected, color: '#dc2626' },
                  { key: 'other',    label: 'Other',    count: logCounts.other,    color: '#ca8a04' },
                ].map(t => (
                  <button key={t.key} onClick={() => setLogTab(t.key)} style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', padding: '.6rem 1.1rem', background: logTab === t.key ? 'white' : 'transparent', border: logTab === t.key ? '1.5px solid rgba(139,99,65,.15)' : '1.5px solid transparent', borderBottom: logTab === t.key ? '2px solid #22c55e' : '2px solid transparent', borderRadius: '10px 10px 0 0', marginBottom: -1, color: logTab === t.key ? '#1e293b' : '#8b6f5c', fontWeight: logTab === t.key ? 800 : 600, fontSize: '.83rem', cursor: 'pointer' }}>
                    {t.label}
                    <span style={{ padding: '.1rem .5rem', borderRadius: 20, background: logTab === t.key ? `${t.color || '#22c55e'}22` : '#f1f5f9', color: logTab === t.key ? (t.color || '#15803d') : '#94a3b8', fontSize: '.7rem', fontWeight: 800 }}>{t.count}</span>
                  </button>
                ))}
              </div>

              <div style={{ overflowX: 'auto' }}>
                {loadingL ? (
                  <div className="center-loader"><RefreshCw size={24} style={{ animation: 'spin .8s linear infinite', color: '#22c55e' }} /><span>Loading logs...</span></div>
                ) : filteredLogs.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon"><ShieldCheck size={30} color="#a89688" /></div><p>No {logTab !== 'all' ? `${logTab} ` : ''}records found.</p></div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg,rgba(250,247,245,.9),rgba(240,253,244,.7))' }}>
                        {['Timestamp', 'Admin Actor', 'Action', 'Entity Type', 'Entity ID', 'Reason', ''].map(h => (
                          <th key={h} style={{ padding: '.85rem 1.25rem', textAlign: 'left', fontSize: '.7rem', fontWeight: 800, color: '#8b6f5c', textTransform: 'uppercase', letterSpacing: '.07em', whiteSpace: 'nowrap', borderBottom: '1.5px solid rgba(139,99,65,.1)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log, i) => (
                        <tr key={log.id || i} className="mod-row" onClick={() => setSelectedLog(log)} style={{ borderBottom: '1px solid rgba(139,99,65,.06)' }}>
                          <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                            <div style={{ fontSize: '.8rem', color: '#64748b', fontWeight: 600 }}>{log.createdAt ? new Date(log.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
                            <div style={{ fontSize: '.72rem', color: '#94a3b8' }}>{log.createdAt ? new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</div>
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                              <div style={{ position: 'relative' }}>
                                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(log.adminName || 'Admin')}&background=15803d&color=fff&size=34`} alt="" style={{ width: 34, height: 34, borderRadius: 9, border: '2px solid rgba(34,197,94,.25)', display: 'block' }} />
                                <span style={{ position: 'absolute', bottom: -2, right: -2, width: 9, height: 9, borderRadius: '50%', background: '#22c55e', border: '2px solid white' }} />
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '.84rem' }}>{log.adminName || 'System Administrator'}</div>
                                <div style={{ fontSize: '.7rem', color: '#94a3b8' }}>Administrator</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}><ActionBadge action={log.action} /></td>
                          <td style={{ padding: '1rem 1.25rem' }}><span style={{ display: 'inline-block', padding: '.22rem .7rem', background: 'rgba(79,70,229,.08)', border: '1px solid rgba(79,70,229,.18)', borderRadius: 7, fontSize: '.77rem', fontWeight: 700, color: '#4f46e5' }}>{log.entityType || '—'}</span></td>
                          <td style={{ padding: '1rem 1.25rem' }}><code style={{ fontSize: '.71rem', color: '#94a3b8', background: '#f8fafc', padding: '.2rem .5rem', borderRadius: 6, border: '1px solid #f1f5f9' }}>{log.entityId ? String(log.entityId).substring(0, 13) + '...' : '—'}</code></td>
                          <td style={{ padding: '1rem 1.25rem', maxWidth: 240 }}><div style={{ fontSize: '.82rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.reason || <span style={{ color: '#cbd5e1' }}>—</span>}</div></td>
                          <td style={{ padding: '1rem 1.25rem' }}><button className="icon-btn" title="View detail"><ChevronRight size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {filteredLogs.length > 0 && (
                <div style={{ padding: '.9rem 1.5rem', borderTop: '1.5px solid rgba(139,99,65,.1)', background: 'rgba(250,247,245,.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '.8rem', color: '#a89688', fontWeight: 600 }}>Showing {filteredLogs.length} of {logs.length} records</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'pulseGlow 2s ease-in-out infinite' }} />
                    <span style={{ fontSize: '.77rem', color: '#8b6f5c', fontWeight: 600 }}>Live audit trail</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};
