import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ListChecks, Send, CheckCircle2, Clock } from 'lucide-react';
import { SectionHeader, StatCard, ProgressBar, EmptyState, ErrorState, Skeleton, StatusBadge, Tag } from '../ui/ui';
import { formatDate, countQuestions } from '../../lib/format';
import { InterviewCard } from './Experiences';
import { useStudentData } from './StudentData';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

/** The plan + topic the student should pick up next: in-progress first, then highest priority. */
const nextFocus = (plans) => {
  const open = (plans || []).filter((p) => p.status !== 'Completed' && p.progress?.length);
  for (const plan of open) {
    const items = plan.progress.filter((t) => t.status !== 'Completed');
    const topic = items.find((t) => t.status === 'In Progress') || items[0];
    if (topic) return { plan, topic };
  }
  return null;
};

export const Overview = ({ userProfile }) => {
  const navigate = useNavigate();
  const { profile, experiences, submissions, plans } = useStudentData();

  const exps = useMemo(() => experiences.data || [], [experiences.data]);
  const subs = useMemo(() => submissions.data || [], [submissions.data]);
  const planList = useMemo(() => plans.data?.plans || [], [plans.data]);
  const summary = plans.data?.summary;

  const firstName = (profile.data?.name || userProfile?.name || '').split(' ')[0];
  const questionCount = exps.reduce((n, e) => n + countQuestions(e), 0);
  const companies = new Set(exps.map((e) => e.companyName).filter(Boolean));
  const pending = subs.filter((s) => (s.moderationStatus || 'PENDING') === 'PENDING').length;
  const focus = nextFocus(planList);

  // Prefer experiences at companies the student is preparing for.
  const targets = new Set(planList.map((p) => p.targetCompanyName?.toLowerCase()).filter(Boolean));
  const recommended = [...exps]
    .sort(
      (a, b) => Number(targets.has(b.companyName?.toLowerCase())) - Number(targets.has(a.companyName?.toLowerCase())),
    )
    .slice(0, 3);

  const activity = useMemo(() => {
    const events = subs.map((s) => ({
      key: `s-${s.id}`,
      when: s.submittedAt,
      icon: Send,
      text: `You shared your ${s.companyName || ''} ${s.role || ''} interview`,
      badge: <StatusBadge status={s.moderationStatus} />,
      to: `/student/experiences/${s.id}`,
    }));
    planList.forEach((p) => {
      events.push({
        key: `p-${p.id}`,
        when: p.createdAt,
        icon: ListChecks,
        text: `Created “${p.title}”`,
        to: '/student/plan',
      });
      (p.progress || [])
        .filter((t) => t.status !== 'Not Started')
        .forEach((t) =>
          events.push({
            key: `t-${t.id}`,
            when: t.updatedAt,
            icon: t.status === 'Completed' ? CheckCircle2 : Clock,
            text: `${t.status === 'Completed' ? 'Completed' : 'Started'} ${t.topic}`,
            to: '/student/plan',
          }),
        );
    });
    return events
      .filter((e) => e.when)
      .sort((a, b) => new Date(b.when) - new Date(a.when))
      .slice(0, 6);
  }, [subs, planList]);

  const statsLoading = experiences.loading && !experiences.data;

  return (
    <>
      <section className="ws-hero">
        <div>
          <div className="ws-eyebrow">Student workspace</div>
          <h1 className="ws-hero-title">
            {greeting()}
            {firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="ws-hero-sub">Prepare smarter for your next interview.</p>
        </div>
        <div className="ws-actions">
          <Link className="ws-btn ws-btn-primary" to="/student/plan">
            Continue preparation
          </Link>
          <Link className="ws-btn ws-btn-secondary" to="/student/experiences">
            Browse interviews
          </Link>
        </div>
      </section>

      <section className="ws-section" aria-labelledby="progress-h">
        <SectionHeader title="Your progress" id="progress-h" />
        {experiences.error && !experiences.data ? (
          <ErrorState message={experiences.error} onRetry={experiences.reload} />
        ) : (
          <div className="ws-stats">
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div className="ws-stat" key={i}>
                  <Skeleton width="60%" height={12} />
                  <Skeleton width="35%" height={28} style={{ marginTop: 10 }} />
                </div>
              ))
            ) : (
              <>
                <StatCard
                  label="Interview experiences"
                  value={exps.length}
                  hint="approved & published"
                  onClick={() => navigate('/student/experiences')}
                />
                <StatCard
                  label="Questions"
                  value={questionCount}
                  hint="from real interviews"
                  onClick={() => navigate('/student/questions')}
                />
                <StatCard
                  label="Companies"
                  value={companies.size}
                  hint="with interview data"
                  onClick={() => navigate('/student/companies')}
                />
                <StatCard
                  label="Study plan progress"
                  value={summary?.totalTopics ? `${summary.completionPercent}%` : '—'}
                  hint={
                    summary?.totalTopics ? `${summary.completed} of ${summary.totalTopics} topics done` : 'no plan yet'
                  }
                  onClick={() => navigate('/student/plan')}
                />
              </>
            )}
          </div>
        )}
      </section>

      <section className="ws-section" aria-labelledby="continue-h">
        <SectionHeader title="Continue where you left off" id="continue-h" />
        {plans.loading && !plans.data ? (
          <Skeleton height={120} style={{ borderRadius: 16 }} />
        ) : plans.error && !plans.data ? (
          <ErrorState title="Couldn't load your study plans" message={plans.error} onRetry={plans.reload} />
        ) : focus ? (
          <div
            className="ws-card ws-card-pad"
            style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}
          >
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                {focus.plan.targetCompanyName && <Tag tone="accent">{focus.plan.targetCompanyName}</Tag>}
                {focus.plan.targetRole && <Tag>{focus.plan.targetRole}</Tag>}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 650 }}>{focus.topic.topic}</div>
              <div className="ws-meta" style={{ marginTop: '0.2rem' }}>
                {focus.topic.status === 'In Progress' ? 'In progress' : 'Up next'} · {focus.plan.title}
              </div>
              <div style={{ marginTop: '1rem', maxWidth: 420 }}>
                <ProgressBar value={focus.plan.completionPercent} label="Plan completion" />
                <div className="ws-meta" style={{ marginTop: '0.4rem' }}>
                  {focus.plan.completedTopics} of {focus.plan.totalTopics} topics · {focus.plan.completionPercent}%
                </div>
              </div>
            </div>
            <Link className="ws-btn ws-btn-primary" to="/student/plan">
              Resume <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <EmptyState
            icon={ListChecks}
            title={planList.length ? 'All caught up' : 'No study plan yet'}
            description={
              planList.length
                ? 'Every topic in your plans is complete. Generate a new plan for your next target.'
                : 'Generate an AI study plan for a company and role, then track your progress topic by topic.'
            }
            action={
              <Link className="ws-btn ws-btn-primary" to="/student/plan">
                Create a study plan
              </Link>
            }
          />
        )}
      </section>

      {recommended.length > 0 && (
        <section className="ws-section" aria-labelledby="rec-h">
          <SectionHeader
            title="Recommended interviews"
            id="rec-h"
            action="View all"
            onAction={() => navigate('/student/experiences')}
          />
          <div className="ws-grid-3">
            {recommended.map((e) => (
              <InterviewCard key={e.id} exp={e} />
            ))}
          </div>
        </section>
      )}

      <section className="ws-section" aria-labelledby="act-h">
        <SectionHeader
          title="Recent activity"
          id="act-h"
          action={pending ? `${pending} awaiting review` : null}
          onAction={() => navigate('/student/submissions')}
        />
        {activity.length === 0 ? (
          <p className="ws-muted">Your submissions and study progress will show up here.</p>
        ) : (
          <div className="ws-list">
            {activity.map((a) => (
              <Link key={a.key} to={a.to} className="ws-row ws-row-clickable" style={{ textDecoration: 'none' }}>
                <span className="ws-avatar" style={{ width: 34, height: 34 }}>
                  <a.icon size={16} aria-hidden="true" />
                </span>
                <div className="ws-row-main">
                  <div style={{ fontSize: '0.9rem' }}>{a.text}</div>
                  <div className="ws-meta">{formatDate(a.when)}</div>
                </div>
                {a.badge}
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
};
