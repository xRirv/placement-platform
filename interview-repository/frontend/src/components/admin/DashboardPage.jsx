import { useState, useEffect } from 'react';
import { Users, GraduationCap, UserCheck, ArrowRight } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { useNavigate } from 'react-router-dom';
import './AdminStyles.css';

export const DashboardPage = ({ user, session, userProfile }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalMentors: 0,
    totalAlumni: 0,
    highRiskLogs: [],
  });

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const [studentsRes, mentorsRes, alumniRes, logsRes] = await Promise.all([
        fetch(`${backendUrl}/api/admin/management/students?size=10000`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(`${backendUrl}/api/admin/management/mentors?size=10000`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(`${backendUrl}/api/admin/management/alumni?size=10000`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(`${backendUrl}/api/admin/management/moderation-logs?size=10`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ]);

      const [studentsData, mentorsData, alumniData, logsData] = await Promise.all([
        studentsRes.ok ? studentsRes.json() : { content: [] },
        mentorsRes.ok ? mentorsRes.json() : { content: [] },
        alumniRes.ok ? alumniRes.json() : { content: [] },
        logsRes.ok ? logsRes.json() : { content: [] },
      ]);

      setStats({
        totalStudents: (studentsData.content || []).length,
        totalMentors: (mentorsData.content || []).length,
        totalAlumni: (alumniData.content || []).length,
        highRiskLogs: logsData.content?.slice(0, 2) || [],
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      setStats({
        totalStudents: 0,
        totalMentors: 0,
        totalAlumni: 0,
        highRiskLogs: [],
      });
    }
  };

  return (
    <AdminLayout user={user} userProfile={userProfile}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div className="admin-stats-grid">
          {/* Total Students */}
          <div className="admin-stat-card">
            <div className="admin-stat-header">
              <div className="admin-stat-icon blue">
                <Users size={20} />
              </div>
              <span className="admin-stat-label">Total Students</span>
            </div>
            <div className="admin-stat-value">
              {stats.totalStudents.toLocaleString()}
            </div>
            <div className="admin-stat-change">+6.4% vs last month</div>
          </div>

          {/* Total Mentors */}
          <div className="admin-stat-card">
            <div className="admin-stat-header">
              <div className="admin-stat-icon green">
                <UserCheck size={20} />
              </div>
              <span className="admin-stat-label">Total Mentors</span>
            </div>
            <div className="admin-stat-value">{stats.totalMentors}</div>
            <div className="admin-stat-change">+2.1%</div>
          </div>

          {/* Total Alumni */}
          <div className="admin-stat-card">
            <div className="admin-stat-header">
              <div className="admin-stat-icon purple">
                <GraduationCap size={20} />
              </div>
              <span className="admin-stat-label">Total Alumni</span>
            </div>
            <div className="admin-stat-value">
              {stats.totalAlumni.toLocaleString()}
            </div>
            <div className="admin-stat-change">+8.9%</div>
          </div>
        </div>

        {/* High Risk Moderation Logs */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">High Risk Moderation Logs</h2>
            <button
              onClick={() => navigate('/admin/moderation')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'transparent',
                border: 'none',
                color: '#4F46E5',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              View All Logs
              <ArrowRight size={16} />
            </button>
          </div>

          <div style={{ padding: '1.5rem' }}>
            {stats.highRiskLogs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {stats.highRiskLogs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => navigate('/admin/moderation')}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '1rem',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        background: '#ef4444',
                        borderRadius: '50%',
                        marginTop: '0.5rem',
                        flexShrink: 0,
                      }}
                    ></div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: '#0f172a',
                          marginBottom: '0.25rem',
                        }}
                      >
                        {log.entityType || 'Student Name'}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        {log.reason || 'Inconsistent responses detected in Mock round 2'}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', flexShrink: 0 }}>
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                <p>No high-risk moderation logs at the moment.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1.5rem' }}>
          <button
            onClick={() => navigate('/admin/students')}
            style={{
              padding: '1.5rem',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#4F46E5';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👨‍🎓</div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 600 }}>
              Manage Students
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
              Add, edit, or remove student records
            </p>
          </button>

          <button
            onClick={() => navigate('/admin/mentors')}
            style={{
              padding: '1.5rem',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#4F46E5';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👨‍🏫</div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 600 }}>
              Manage Mentors
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
              Oversee mentor assignments
            </p>
          </button>

          <button
            onClick={() => navigate('/admin/alumni')}
            style={{
              padding: '1.5rem',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#4F46E5';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎓</div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 600 }}>
              Manage Alumni
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
              Connect with alumni network
            </p>
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};
