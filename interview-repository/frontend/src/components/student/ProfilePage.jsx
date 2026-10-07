import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Save } from 'lucide-react';
import { PageHeader, SectionHeader, ProgressBar, ErrorState, Skeleton, Button, Tag } from '../ui/ui';
import { useStudentData } from './StudentData';

// Fields the backend stores for a student profile, with how they count toward completeness.
const FIELDS = [
  ['name', 'Full name'],
  ['phone', 'Phone'],
  ['bio', 'About you'],
  ['college', 'College'],
  ['degree', 'Degree'],
  ['graduationYear', 'Graduation year'],
  ['skills', 'Skills'],
  ['githubUrl', 'GitHub'],
  ['linkedinUrl', 'LinkedIn'],
  ['resumeUrl', 'Resume link'],
];

const fromProfile = (p) => ({
  name: p?.name || '',
  phone: p?.phone || '',
  bio: p?.bio || '',
  college: p?.college || '',
  degree: p?.degree || '',
  graduationYear: p?.graduationYear || '',
  skills: p?.skills || '',
  githubUrl: p?.githubUrl || p?.githubURL || '',
  linkedinUrl: p?.linkedinUrl || p?.linkedinURL || '',
  resumeUrl: p?.resumeUrl || p?.resumeURL || '',
});

const Field = ({ id, label, children, full }) => (
  <div className={full ? 'ws-field-full' : undefined}>
    <label className="ws-label" htmlFor={id}>
      {label}
    </label>
    {children}
  </div>
);

const ProfileForm = ({ initial, email, onSaved }) => {
  const { api } = useStudentData();
  const [form, setForm] = useState(() => fromProfile(initial));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const filled = FIELDS.filter(([k]) => String(form[k] ?? '').trim()).length;
  const percent = Math.round((filled / FIELDS.length) * 100);
  const missing = FIELDS.filter(([k]) => !String(form[k] ?? '').trim()).map(([, label]) => label);
  const skills = form.skills
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      await api.put('/api/student/profile', {
        ...form,
        graduationYear: form.graduationYear ? Number(form.graduationYear) : null,
      });
      setStatus({ ok: true, text: 'Profile saved.' });
      onSaved();
    } catch (err) {
      setStatus({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save}>
      <section
        className="ws-card ws-card-pad"
        aria-labelledby="complete-h"
        style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}
      >
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 id="complete-h" className="ws-section-title">
              Profile completeness
            </h2>
            <span style={{ fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>{percent}%</span>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <ProgressBar value={percent} label="Profile completeness" />
          </div>
          <p className="ws-meta" style={{ marginTop: '0.5rem' }}>
            {missing.length ? `Missing: ${missing.join(', ')}` : 'Your profile is complete.'}
          </p>
        </div>
        <Button type="submit" icon={Save} disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
      </section>

      {status && (
        <div
          className={`ws-alert ${status.ok ? 'ws-alert-success' : 'ws-alert-error'}`}
          role="status"
          style={{ marginTop: '1rem' }}
        >
          {status.ok && <CheckCircle size={16} aria-hidden="true" />} {status.text}
        </div>
      )}

      <section className="ws-section ws-card ws-card-pad" aria-labelledby="about-h">
        <SectionHeader title="Profile" id="about-h" />
        <div className="ws-field-grid">
          <Field id="p-name" label="Full name">
            <input id="p-name" className="ws-input" value={form.name} onChange={set('name')} />
          </Field>
          <Field id="p-email" label="Email">
            <input id="p-email" className="ws-input" value={email || ''} disabled readOnly />
          </Field>
          <Field id="p-phone" label="Phone">
            <input id="p-phone" className="ws-input" value={form.phone} onChange={set('phone')} placeholder="+91 …" />
          </Field>
          <Field id="p-bio" label="About you" full>
            <textarea
              id="p-bio"
              className="ws-textarea"
              value={form.bio}
              onChange={set('bio')}
              placeholder="A short summary recruiters and mentors will see."
            />
          </Field>
        </div>
      </section>

      <section className="ws-section ws-card ws-card-pad" aria-labelledby="edu-h">
        <SectionHeader title="Education" id="edu-h" />
        <div className="ws-field-grid">
          <Field id="p-college" label="College / University">
            <input
              id="p-college"
              className="ws-input"
              value={form.college}
              onChange={set('college')}
              placeholder="e.g. National Institute of Technology"
            />
          </Field>
          <Field id="p-degree" label="Degree & branch">
            <input
              id="p-degree"
              className="ws-input"
              value={form.degree}
              onChange={set('degree')}
              placeholder="e.g. B.Tech Computer Science"
            />
          </Field>
          <Field id="p-year" label="Graduation year">
            <input
              id="p-year"
              className="ws-input"
              type="number"
              min="2000"
              max="2100"
              value={form.graduationYear}
              onChange={set('graduationYear')}
            />
          </Field>
        </div>
      </section>

      <section className="ws-section ws-card ws-card-pad" aria-labelledby="skills-h">
        <SectionHeader title="Skills" id="skills-h" />
        <Field id="p-skills" label="Technical skills (comma-separated)">
          <input
            id="p-skills"
            className="ws-input"
            value={form.skills}
            onChange={set('skills')}
            placeholder="e.g. Java, Spring Boot, React, System Design"
          />
        </Field>
        {skills.length > 0 && (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.85rem' }}>
            {skills.map((s) => (
              <span className="ws-chip" key={s}>
                {s}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="ws-section ws-card ws-card-pad" aria-labelledby="links-h">
        <SectionHeader title="Links" id="links-h" />
        <div className="ws-field-grid">
          <Field id="p-gh" label="GitHub">
            <input
              id="p-gh"
              className="ws-input"
              type="url"
              value={form.githubUrl}
              onChange={set('githubUrl')}
              placeholder="https://github.com/…"
            />
          </Field>
          <Field id="p-li" label="LinkedIn">
            <input
              id="p-li"
              className="ws-input"
              type="url"
              value={form.linkedinUrl}
              onChange={set('linkedinUrl')}
              placeholder="https://linkedin.com/in/…"
            />
          </Field>
          <Field id="p-cv" label="Resume link" full>
            <input
              id="p-cv"
              className="ws-input"
              type="url"
              value={form.resumeUrl}
              onChange={set('resumeUrl')}
              placeholder="https://drive.google.com/…"
            />
          </Field>
        </div>
      </section>
    </form>
  );
};

export const ProfilePage = ({ user }) => {
  const { profile, plans } = useStudentData();
  const targets = useMemo(() => plans.data?.plans || [], [plans.data]);

  return (
    <>
      <PageHeader
        eyebrow="Preparation"
        title="Candidate Profile"
        subtitle="Your profile is shared with your mentor and used to personalise your preparation."
      />
      {profile.loading && !profile.data ? (
        <div aria-busy="true">
          <Skeleton height={110} style={{ borderRadius: 16 }} />
          <Skeleton height={240} style={{ borderRadius: 16, marginTop: 24 }} />
        </div>
      ) : profile.error && !profile.data ? (
        <ErrorState title="Couldn't load your profile" message={profile.error} onRetry={profile.reload} />
      ) : (
        <>
          <ProfileForm
            key={profile.data?.id || 'profile'}
            initial={profile.data}
            email={profile.data?.email || user?.email}
            onSaved={profile.reload}
          />
          <section className="ws-section ws-card ws-card-pad" aria-labelledby="targets-h">
            <SectionHeader title="Target companies & roles" id="targets-h" />
            {targets.length ? (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {targets.map((p) => (
                  <Tag key={p.id} tone="accent">
                    {[p.targetCompanyName, p.targetRole].filter(Boolean).join(' · ')}
                  </Tag>
                ))}
              </div>
            ) : (
              <p className="ws-muted">
                Your targets come from your study plans. <Link to="/student/plan">Create a plan</Link> to add one.
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
};
