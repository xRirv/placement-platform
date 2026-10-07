import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Send, Eye, Pencil, CheckCircle } from 'lucide-react';
import {
  PageHeader,
  CompanyAvatar,
  StatusBadge,
  SearchBar,
  Segmented,
  EmptyState,
  ErrorState,
  ListSkeleton,
  Button,
} from '../ui/ui';
import { formatDate, countQuestions } from '../../lib/format';
import { ExperienceModal } from '../ExperienceModal';
import { useStudentData } from './StudentData';

const STATUS_HINT = {
  PENDING: 'Under admin review — visible to others once approved.',
  REJECTED: 'Not approved. You can edit and resubmit it.',
};

export const SubmissionsPage = () => {
  const navigate = useNavigate();
  const { session, backendUrl, submissions, experiences } = useStudentData();
  const [filter, setFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState({ open: false, initial: null });
  const [message, setMessage] = useState('');

  const items = useMemo(() => submissions.data || [], [submissions.data]);
  const counts = useMemo(() => {
    const c = { ALL: items.length, PENDING: 0, APPROVED: 0, REJECTED: 0 };
    items.forEach((s) => {
      const k = (s.moderationStatus || 'PENDING').toUpperCase();
      if (c[k] != null) c[k] += 1;
    });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((s) => {
      const status = (s.moderationStatus || 'PENDING').toUpperCase();
      if (filter !== 'ALL' && status !== filter) return false;
      return !q || s.companyName?.toLowerCase().includes(q) || s.role?.toLowerCase().includes(q);
    });
  }, [items, filter, query]);

  const openCreate = () => setModal({ open: true, initial: null });
  const onSaved = () => {
    const editing = Boolean(modal.initial);
    submissions.reload();
    experiences.reload();
    setMessage(
      editing ? 'Submission updated and sent for review.' : 'Experience submitted — an admin will review it shortly.',
    );
    setTimeout(() => setMessage(''), 5000);
  };

  let body;
  if (submissions.loading && !submissions.data) {
    body = <ListSkeleton rows={4} />;
  } else if (submissions.error && !submissions.data) {
    body = (
      <ErrorState title="Couldn't load your submissions" message={submissions.error} onRetry={submissions.reload} />
    );
  } else if (items.length === 0) {
    body = (
      <EmptyState
        icon={Send}
        title="No submissions yet"
        description="Share your interview experience to help other students prepare and build your interview portfolio."
        action={
          <Button icon={Plus} onClick={openCreate}>
            Submit an experience
          </Button>
        }
      />
    );
  } else if (filtered.length === 0) {
    body = (
      <EmptyState
        icon={Send}
        title="Nothing matches"
        description="No submissions match this status or search."
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setFilter('ALL');
              setQuery('');
            }}
          >
            Show all submissions
          </Button>
        }
      />
    );
  } else {
    body = (
      <div className="ws-list">
        {filtered.map((s) => {
          const status = (s.moderationStatus || 'PENDING').toUpperCase();
          const q = countQuestions(s);
          return (
            <div className="ws-row" key={s.id}>
              <CompanyAvatar name={s.companyName} />
              <div className="ws-row-main">
                <div className="ws-row-title">{s.companyName || 'Unknown company'}</div>
                <div className="ws-row-sub">
                  {s.role}
                  {q ? ` · ${q} question${q === 1 ? '' : 's'}` : ''}
                </div>
                {STATUS_HINT[status] && (
                  <div className="ws-meta" style={{ marginTop: '0.3rem' }}>
                    {STATUS_HINT[status]}
                  </div>
                )}
              </div>
              <div className="ws-row-cols">
                <div className="ws-row-col">
                  <div className="ws-row-col-label">Submitted</div>
                  <div className="ws-row-col-value">
                    {formatDate(s.submittedAt, { month: 'short', day: 'numeric' }) || '—'}
                  </div>
                </div>
                <div className="ws-row-col">
                  <div className="ws-row-col-label">Status</div>
                  <div style={{ marginTop: 2 }}>
                    <StatusBadge status={status} />
                  </div>
                </div>
                <div className="ws-actions">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Pencil}
                    onClick={() => setModal({ open: true, initial: s })}
                    aria-label={`Edit ${s.companyName} submission`}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Eye}
                    onClick={() => navigate(`/student/experiences/${s.id}`)}
                    aria-label={`View ${s.companyName} submission`}
                  >
                    View
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="My Submissions"
        subtitle="Track the interview experiences you've shared and their review status."
        actions={
          <Button icon={Plus} onClick={openCreate}>
            Submit an experience
          </Button>
        }
      />

      {message && (
        <div className="ws-alert ws-alert-success" role="status">
          <CheckCircle size={16} aria-hidden="true" /> {message}
        </div>
      )}

      {items.length > 0 && (
        <div className="ws-toolbar">
          <Segmented
            label="Filter by status"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'ALL', label: 'All', count: counts.ALL },
              { value: 'PENDING', label: 'Pending', count: counts.PENDING },
              { value: 'APPROVED', label: 'Approved', count: counts.APPROVED },
              { value: 'REJECTED', label: 'Rejected', count: counts.REJECTED },
            ]}
          />
          <SearchBar value={query} onChange={setQuery} placeholder="Search company or role…" />
        </div>
      )}

      {body}

      <ExperienceModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, initial: null })}
        onSuccess={onSaved}
        initialData={modal.initial}
        session={session}
        backendUrl={backendUrl}
      />
    </>
  );
};
