import { Link } from 'react-router-dom';
import { GraduationCap, Mail, RotateCcw, Target } from 'lucide-react';
import { PageHeader, SectionHeader, CompanyAvatar, ErrorState, Skeleton, Button, Tag, StatusBadge } from '../ui/ui';
import { useStudentData } from './StudentData';

export const MentorPage = () => {
  const { profile, plans } = useStudentData();
  const p = profile.data;
  const goals = plans.data?.plans || [];

  return (
    <>
      <PageHeader
        eyebrow="Career"
        title="My Mentor"
        subtitle="Your assigned mentor helps you review progress and prepare for interviews."
      />

      {profile.loading && !p ? (
        <Skeleton height={180} style={{ borderRadius: 16 }} />
      ) : profile.error && !p ? (
        <ErrorState title="Couldn't load mentor details" message={profile.error} onRetry={profile.reload} />
      ) : p?.mentorName ? (
        <section
          className="ws-card ws-card-pad"
          aria-labelledby="mentor-h"
          style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}
        >
          <CompanyAvatar name={p.mentorName} size={64} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <StatusBadge status="APPROVED" label="Assigned" />
            <h2 id="mentor-h" style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.6rem' }}>
              {p.mentorName}
            </h2>
            {p.mentorEmail && <div className="ws-muted">{p.mentorEmail}</div>}
            {p.mentorExpertise && (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.9rem' }}>
                {p.mentorExpertise
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((s) => (
                    <span key={s} className="ws-chip">
                      {s}
                    </span>
                  ))}
              </div>
            )}
          </div>
          {p.mentorEmail && (
            <a
              className="ws-btn ws-btn-primary"
              href={`mailto:${p.mentorEmail}?subject=${encodeURIComponent('Interview preparation guidance')}&body=${encodeURIComponent(
                `Hi ${p.mentorName},\n\nI'd like your guidance on my interview preparation.\n\nThanks,\n${p.name || ''}`,
              )}`}
            >
              <Mail size={16} aria-hidden="true" /> Email mentor
            </a>
          )}
        </section>
      ) : (
        <section
          className="ws-card ws-card-pad"
          aria-labelledby="pending-h"
          style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}
        >
          <div className="ws-empty-icon" style={{ margin: 0 }}>
            <GraduationCap size={22} aria-hidden="true" />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <StatusBadge status="PENDING" label="Pending assignment" />
            <h2 id="pending-h" style={{ fontSize: '1.2rem', fontWeight: 650, marginTop: '0.5rem' }}>
              Mentor assignment
            </h2>
            <p className="ws-muted" style={{ marginTop: '0.25rem' }}>
              Your mentor assignment is pending. An administrator assigns mentors — check back soon.
            </p>
          </div>
          <Button variant="secondary" icon={RotateCcw} onClick={profile.reload} disabled={profile.loading}>
            {profile.loading ? 'Checking…' : 'Check status'}
          </Button>
        </section>
      )}

      <section className="ws-section" aria-labelledby="goals-h">
        <SectionHeader title="Your goals" id="goals-h" />
        {goals.length ? (
          <div className="ws-list">
            {goals.map((g) => (
              <div className="ws-row" key={g.id}>
                <span className="ws-avatar" style={{ width: 34, height: 34 }}>
                  <Target size={16} aria-hidden="true" />
                </span>
                <div className="ws-row-main">
                  <div className="ws-row-title">{g.title}</div>
                  <div className="ws-meta">
                    {g.completedTopics} of {g.totalTopics} topics · target {g.targetDate}
                  </div>
                </div>
                <Tag>{g.completionPercent}%</Tag>
              </div>
            ))}
          </div>
        ) : (
          <p className="ws-muted">
            Share clear goals with your mentor — <Link to="/student/plan">create a study plan</Link> for your target
            company.
          </p>
        )}
      </section>
    </>
  );
};
