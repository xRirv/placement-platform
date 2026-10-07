import {
  Sparkles,
  CheckCircle2,
  Building2,
  Users2,
  BookOpenCheck,
  ShieldCheck,
  Compass,
} from 'lucide-react';

export const ShowcasePanel = () => {
  const companies = ['Google', 'Amazon', 'Microsoft', 'Atlassian', 'Uber', 'Goldman Sachs'];

  return (
    <div className="rocketlane-showcase">
      {/* Editorial Pill Badge */}
      <div className="editorial-pill">
        <span className="editorial-pill-dot" />
        <span className="editorial-pill-text">The Placement Intelligence Collective</span>
      </div>

      {/* Hero Headline — Rocketlane Style Bold & Minimalist */}
      <div className="editorial-headline-wrap">
        <h1 className="editorial-title">
          Real interview loops.{' '}
          <span className="editorial-highlight-green">Verified questions.</span>{' '}
          <span className="editorial-highlight-brown">Zero guesswork.</span>
        </h1>
        <p className="editorial-sub">
          Learn from authentic, multi-round interview experiences shared by your placed seniors.
          Explore the exact DSA problems, system design trade-offs, and 1-on-1 mentor guidance to land your dream offer.
        </p>
      </div>

      {/* Minimalist Floating Pill Badges */}
      <div className="editorial-features-grid">
        <div className="editorial-badge-pill pill-forest">
          <BookOpenCheck size={15} />
          <span>Multi-Round Coding & System Design</span>
        </div>
        <div className="editorial-badge-pill pill-brown">
          <Users2 size={15} />
          <span>1-on-1 Industry Mentorship</span>
        </div>
        <div className="editorial-badge-pill pill-sage">
          <ShieldCheck size={15} />
          <span>100% Peer & Admin Verified</span>
        </div>
      </div>

      {/* Clean Company Strip */}
      <div className="editorial-company-strip">
        <span className="company-strip-title">
          <Building2 size={13} />
          <span>Trusted insights for candidates targeting</span>
        </span>
        <div className="company-tags-wrap">
          {companies.map((comp) => (
            <span key={comp} className="company-tag-minimal">
              {comp}
            </span>
          ))}
        </div>
      </div>

      {/* Trust Quote */}
      <div className="editorial-quote-box">
        <div className="quote-indicator" />
        <p className="quote-text">
          "Don't guess what companies ask. Prepare with the exact rounds and questions faced by seniors from your own college."
        </p>
      </div>
    </div>
  );
};
