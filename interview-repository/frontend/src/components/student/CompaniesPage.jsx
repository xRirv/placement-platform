import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import {
  PageHeader,
  CompanyAvatar,
  SearchBar,
  Segmented,
  EmptyState,
  ErrorState,
  ListSkeleton,
  ProgressBar,
  Tag,
  Button,
} from '../ui/ui';
import { useStudentData } from './StudentData';

/**
 * Company directory built from real data: companies with approved interview experiences
 * plus companies the student has a study plan for (their targets).
 */
export const CompaniesPage = () => {
  const navigate = useNavigate();
  const { experiences, plans } = useStudentData();
  const [query, setQuery] = useState('');
  const [view, setView] = useState('ALL');

  const rows = useMemo(() => {
    const map = new Map();
    const get = (name) => {
      const key = name.trim().toLowerCase();
      if (!map.has(key)) map.set(key, { name: name.trim(), roles: new Set(), interviews: 0, offers: 0, plan: null });
      return map.get(key);
    };
    (experiences.data || []).forEach((e) => {
      if (!e.companyName) return;
      const r = get(e.companyName);
      r.interviews += 1;
      if (e.role) r.roles.add(e.role);
      if (/offer|select/i.test(e.interviewResult || '')) r.offers += 1;
    });
    (plans.data?.plans || []).forEach((p) => {
      if (!p.targetCompanyName) return;
      const r = get(p.targetCompanyName);
      if (p.targetRole) r.roles.add(p.targetRole);
      if (!r.plan || p.completionPercent > r.plan.completionPercent) r.plan = p;
    });
    return [...map.values()].sort(
      (a, b) => Number(Boolean(b.plan)) - Number(Boolean(a.plan)) || b.interviews - a.interviews,
    );
  }, [experiences.data, plans.data]);

  const targets = rows.filter((r) => r.plan).length;
  const filtered = rows.filter(
    (r) =>
      (view === 'TARGET' ? r.plan : true) &&
      (!query.trim() || r.name.toLowerCase().includes(query.trim().toLowerCase())),
  );
  const loading = (experiences.loading && !experiences.data) || (plans.loading && !plans.data);

  return (
    <>
      <PageHeader
        eyebrow="Career"
        title="Target Companies"
        subtitle="Companies with interview data on the platform, and the ones you're preparing for."
      />
      <div className="ws-toolbar">
        <Segmented
          label="Show"
          value={view}
          onChange={setView}
          options={[
            { value: 'ALL', label: 'All companies', count: rows.length },
            { value: 'TARGET', label: 'My targets', count: targets },
          ]}
        />
        <SearchBar value={query} onChange={setQuery} placeholder="Search companies…" />
      </div>

      {loading ? (
        <ListSkeleton rows={5} />
      ) : experiences.error && !experiences.data ? (
        <ErrorState message={experiences.error} onRetry={experiences.reload} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={view === 'TARGET' ? 'No target companies yet' : 'No companies found'}
          description={
            view === 'TARGET'
              ? 'A company becomes a target when you create a study plan for it.'
              : 'Companies appear once interview experiences are approved.'
          }
          action={view === 'TARGET' && <Button onClick={() => navigate('/student/plan')}>Create a study plan</Button>}
        />
      ) : (
        <div className="ws-list">
          {filtered.map((r) => (
            <div className="ws-row" key={r.name}>
              <CompanyAvatar name={r.name} />
              <div className="ws-row-main">
                <div className="ws-row-title">{r.name}</div>
                <div className="ws-row-sub">{[...r.roles].slice(0, 3).join(', ') || 'Role not specified'}</div>
              </div>
              <div className="ws-row-cols">
                <div className="ws-row-col" style={{ minWidth: 130 }}>
                  <div className="ws-row-col-label">Preparation</div>
                  {r.plan ? (
                    <div style={{ marginTop: 6 }}>
                      <ProgressBar value={r.plan.completionPercent} label={`${r.name} preparation`} />
                      <div className="ws-meta" style={{ marginTop: 3 }}>
                        {r.plan.completionPercent}%
                      </div>
                    </div>
                  ) : (
                    <div className="ws-row-col-value ws-muted">—</div>
                  )}
                </div>
                <div className="ws-row-col">
                  <div className="ws-row-col-label">Interviews</div>
                  <div className="ws-row-col-value">{r.interviews}</div>
                </div>
                <div className="ws-row-col">
                  <div className="ws-row-col-label">Status</div>
                  <div style={{ marginTop: 2 }}>{r.plan ? <Tag tone="accent">Target</Tag> : <Tag>Exploring</Tag>}</div>
                </div>
                <div className="ws-actions">
                  {r.interviews > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/student/experiences?company=${encodeURIComponent(r.name)}`)}
                    >
                      View
                    </Button>
                  )}
                  <Button
                    variant={r.plan ? 'ghost' : 'secondary'}
                    size="sm"
                    onClick={() =>
                      navigate(
                        r.plan
                          ? '/student/plan'
                          : `/student/plan?company=${encodeURIComponent(r.name)}&role=${encodeURIComponent([...r.roles][0] || '')}`,
                      )
                    }
                  >
                    {r.plan ? 'Open plan' : 'Plan'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
