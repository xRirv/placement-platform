import { useState } from 'react';
import {
  Sparkles,
  Code2,
  Layers,
  Users,
  TrendingUp,
  Building2,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';

export const ShowcasePanel = () => {
  const [activeModule, setActiveModule] = useState(null);

  const modules = [
    {
      id: 'coding',
      icon: Code2,
      category: 'Coding Rounds',
      title: 'Algorithms & Data Structures',
      desc: 'Real candidate problems, DP patterns, graph optimizations, and optimal time-space trade-offs.',
      tag: '3,200+ Problems',
      animationClass: 'card-float-1',
    },
    {
      id: 'system-design',
      icon: Layers,
      category: 'System Design',
      title: 'High-Scale Architecture',
      desc: 'Distributed event caching, horizontal scaling, partition tolerance, and trade-off rubrics.',
      tag: 'Scale & Reliability',
      animationClass: 'card-float-2',
    },
    {
      id: 'behavioral',
      icon: Users,
      category: 'Behavioral Rounds',
      title: 'Leadership & Culture Fit',
      desc: 'STAR framework breakdowns, cross-functional collaboration stories, and executive presence.',
      tag: 'STAR Framework',
      animationClass: 'card-float-3',
    },
    {
      id: 'insights',
      icon: TrendingUp,
      category: 'Candidate Experience',
      title: 'Verified Offers & Levels',
      desc: 'Compensation rubrics, level mapping, negotiation leverage, and authentic interview timelines.',
      tag: 'Candidate Insights',
      animationClass: 'card-float-4',
    },
  ];

  const companies = ['Google', 'Meta', 'Amazon', 'Apple', 'Stripe', 'Netflix'];

  return (
    <div className="showcase-container">
      {/* Animated Anime Scenery Background */}
      <div className="ambient-mesh" aria-hidden="true" />
      <div className="ambient-orb orb-1" aria-hidden="true" />
      <div className="ambient-orb orb-2" aria-hidden="true" />

      {/* Animated Tree with Character */}
      <div className="anime-scenery-tree" aria-hidden="true">
        <div className="tree-trunk" />
        <div className="tree-canopy" />
        <div className="tree-branches">
          <div className="branch" />
          <div className="branch" />
          <div className="branch" />
        </div>
      </div>

      {/* Anime Character Sitting Under Tree */}
      <div className="anime-character" aria-hidden="true">
        <div className="character-head" />
        <div className="character-figure" />
      </div>

      {/* Falling Leaves Animation */}
      <div className="leaves-container" aria-hidden="true">
        <div className="leaf" />
        <div className="leaf" />
        <div className="leaf" />
        <div className="leaf" />
        <div className="leaf" />
        <div className="leaf" />
        <div className="leaf" />
        <div className="leaf" />
      </div>

      {/* Grass Elements */}
      <div className="grass-elements" aria-hidden="true">
        <div className="grass-blade" />
        <div className="grass-blade" />
        <div className="grass-blade" />
        <div className="grass-blade" />
        <div className="grass-blade" />
        <div className="grass-blade" />
        <div className="grass-blade" />
        <div className="grass-blade" />
        <div className="grass-blade" />
        <div className="grass-blade" />
      </div>

      <div className="showcase-content">
        {/* Brand Header */}
        <div className="brand-header">
          <div className="brand-logo-mark">
            <Sparkles size={18} className="brand-icon-sparkle" />
          </div>
          <div className="brand-text">
            <span className="brand-name">InterviewRepo</span>
            <span className="brand-badge">INTERVIEW INTELLIGENCE</span>
          </div>
        </div>

        {/* Main Headline & Supporting Value Statement */}
        <div className="showcase-headline-section">
          <h1 className="showcase-title">
            Unlock Verified <span className="text-gradient">Interview Intelligence</span>
          </h1>
          <p className="showcase-description">
            Explore thousands of real candidate rounds, system design rubrics, and verified
            compensation breakdowns from top-tier engineering organizations.
          </p>
        </div>

        {/* Floating Interactive "Interview Intelligence" Graphics Grid */}
        <div className="intelligence-grid" role="region" aria-label="Interview Modules">
          {modules.map((item) => {
            const Icon = item.icon;
            const isHovered = activeModule === item.id;
            return (
              <div
                key={item.id}
                className={`intelligence-card ${item.animationClass} ${
                  isHovered ? 'intelligence-card-hovered' : ''
                }`}
                onMouseEnter={() => setActiveModule(item.id)}
                onMouseLeave={() => setActiveModule(null)}
              >
                <div className="intelligence-card-header">
                  <div className="intelligence-icon-box">
                    <Icon size={17} />
                  </div>
                  <span className="intelligence-tag">{item.tag}</span>
                </div>

                <div className="intelligence-category">{item.category}</div>
                <h2 className="intelligence-title">{item.title}</h2>
                <p className="intelligence-desc">{item.desc}</p>

                <div className="intelligence-action">
                  <span>Explore round insights</span>
                  <ArrowUpRight size={13} className="intelligence-arrow" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Social Proof / Targeted Teams Strip */}
        <div className="company-strip">
          <div className="company-strip-label">
            <Building2 size={14} />
            <span>Targeting engineering teams at</span>
          </div>
          <div className="company-pills">
            {companies.map((company) => (
              <span key={company} className="company-pill">
                {company}
              </span>
            ))}
          </div>
        </div>

        {/* Community Trust Signals */}
        <div className="trust-footer">
          <div className="trust-item">
            <CheckCircle2 size={15} className="text-emerald" />
            <span>5,200+ Verified Experiences</span>
          </div>
          <div className="trust-divider" />
          <div className="trust-item">
            <CheckCircle2 size={15} className="text-emerald" />
            <span>100% Peer-Reviewed</span>
          </div>
          <div className="trust-divider" />
          <div className="trust-item">
            <CheckCircle2 size={15} className="text-emerald" />
            <span>Candidate-First Transparency</span>
          </div>
        </div>
      </div>
    </div>
  );
};
