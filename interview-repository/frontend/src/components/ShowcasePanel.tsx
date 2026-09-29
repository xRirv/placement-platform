import React, { useState } from 'react';
import { Terminal, Shield, Zap, Sparkles, Building2, CheckCircle2, ArrowUpRight } from 'lucide-react';

export const ShowcasePanel: React.FC = () => {
  const [activeCard, setActiveCard] = useState<number | null>(null);

  const features = [
    {
      icon: Terminal,
      title: 'Real Interview Breakdowns',
      desc: 'Coding, System Design, and Behavioral rounds from FAANG & top tier tech.',
      tag: '5,200+ experiences',
    },
    {
      icon: Shield,
      title: 'Zero-Trust Verification',
      desc: 'End-to-end encrypted identity backed by Supabase Auth and Spring Security RBAC.',
      tag: 'Zero Password Storage',
    },
    {
      icon: Zap,
      title: 'Instant Profile Sync',
      desc: 'Seamless token exchange with backend microservices and instant role validation.',
      tag: 'Sub-millisecond sync',
    },
  ];

  const companies = ['Google', 'Meta', 'Amazon', 'Apple', 'Stripe', 'Netflix'];

  return (
    <div className="showcase-container">
      {/* Ambient background glow orbs */}
      <div className="ambient-glow glow-1" />
      <div className="ambient-glow glow-2" />

      <div className="showcase-content">
        {/* Brand header */}
        <div className="brand-header">
          <div className="brand-logo-mark">
            <Sparkles size={20} className="brand-icon-anim" />
          </div>
          <div className="brand-text">
            <span className="brand-name">InterviewRepo</span>
            <span className="brand-badge">SECURE PORTAL</span>
          </div>
        </div>

        {/* Main headline */}
        <div className="showcase-headline-section">
          <h1 className="showcase-title">
            Unlock Verified <span className="text-gradient">Interview Intelligence</span>
          </h1>
          <p className="showcase-description">
            Access thousands of real candidate rounds, system design rubrics, and salary breakdowns.
            Protected by enterprise-grade Supabase authentication.
          </p>
        </div>

        {/* Interactive Feature Cards */}
        <div className="feature-cards-grid">
          {features.map((feat, index) => {
            const Icon = feat.icon;
            const isHovered = activeCard === index;
            return (
              <div
                key={feat.title}
                className={`feature-card ${isHovered ? 'feature-card-hovered' : ''}`}
                onMouseEnter={() => setActiveCard(index)}
                onMouseLeave={() => setActiveCard(null)}
              >
                <div className="feature-card-header">
                  <div className="feature-icon-wrapper">
                    <Icon size={18} />
                  </div>
                  <span className="feature-tag">{feat.tag}</span>
                </div>
                <h2 className="feature-title">{feat.title}</h2>
                <p className="feature-desc">{feat.desc}</p>
                <div className="feature-hover-indicator">
                  <span>Explore module</span>
                  <ArrowUpRight size={14} className="feature-arrow" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Social Proof / Stats Strip */}
        <div className="company-strip">
          <div className="company-strip-label">
            <Building2 size={14} />
            <span>Targeting teams at</span>
          </div>
          <div className="company-pills">
            {companies.map((company) => (
              <span key={company} className="company-pill">
                {company}
              </span>
            ))}
          </div>
        </div>

        {/* Trust badge */}
        <div className="trust-footer">
          <div className="trust-item">
            <CheckCircle2 size={15} className="text-emerald" />
            <span>Strict privacy & blind verification</span>
          </div>
          <div className="trust-divider" />
          <div className="trust-item">
            <CheckCircle2 size={15} className="text-emerald" />
            <span>OAuth 2.0 / JWT Standard</span>
          </div>
        </div>
      </div>
    </div>
  );
};
