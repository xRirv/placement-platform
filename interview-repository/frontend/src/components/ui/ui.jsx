import { Component } from 'react';
import { AlertTriangle, RotateCcw, Search } from 'lucide-react';

// Shared building blocks for the student workspace (styles in styles/workspace.css).

export const PageHeader = ({ eyebrow, title, subtitle, actions }) => (
  <header className="ws-page-header">
    <div>
      {eyebrow && <div className="ws-eyebrow">{eyebrow}</div>}
      <h1 className="ws-page-title">{title}</h1>
      {subtitle && <p className="ws-page-sub">{subtitle}</p>}
    </div>
    {actions && <div className="ws-actions">{actions}</div>}
  </header>
);

export const SectionHeader = ({ title, action, onAction, id }) => (
  <div className="ws-section-header">
    <h2 className="ws-section-title" id={id}>
      {title}
    </h2>
    {action && (
      <button type="button" className="ws-section-link" onClick={onAction}>
        {action}
      </button>
    )}
  </div>
);

export const Button = ({ variant = 'primary', size, icon: Icon, children, className = '', ...props }) => (
  <button
    type="button"
    className={`ws-btn ws-btn-${variant} ${size === 'sm' ? 'ws-btn-sm' : ''} ${className}`}
    {...props}
  >
    {Icon && <Icon size={size === 'sm' ? 14 : 16} aria-hidden="true" />}
    {children}
  </button>
);

export const StatCard = ({ label, value, hint, onClick }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className="ws-stat" onClick={onClick} {...(onClick ? { type: 'button' } : {})}>
      <div className="ws-stat-label">{label}</div>
      <div className="ws-stat-value">{value}</div>
      {hint && <div className="ws-stat-hint">{hint}</div>}
    </Tag>
  );
};

const STATUS_TONES = {
  APPROVED: ['success', 'Approved'],
  PENDING: ['warning', 'Pending review'],
  REJECTED: ['danger', 'Rejected'],
  COMPLETED: ['success', 'Completed'],
  'IN PROGRESS': ['warning', 'In progress'],
  'NOT STARTED': ['neutral', 'Not started'],
};

/** Status with a dot and text label, so color is never the only signal. */
export const StatusBadge = ({ status, label }) => {
  const key = (status || 'PENDING').toUpperCase().replace('_', ' ');
  const [tone, text] = STATUS_TONES[key] || ['neutral', status];
  return <span className={`ws-badge ws-badge-dot ws-badge-${tone}`}>{label || text}</span>;
};

export const Tag = ({ children, tone }) => (
  <span className={`ws-badge ${tone ? `ws-badge-${tone}` : ''}`}>{children}</span>
);

export const CompanyAvatar = ({ name, size = 40 }) => {
  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
  return (
    <span className="ws-avatar" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden="true">
      {initials || '?'}
    </span>
  );
};

export const ProgressBar = ({ value, label }) => (
  <div
    className="ws-progress"
    role="progressbar"
    aria-valuenow={Math.round(value || 0)}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label={label}
  >
    <span style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} />
  </div>
);

export const SearchBar = ({ value, onChange, placeholder, label }) => (
  <div className="ws-search">
    <Search size={16} aria-hidden="true" />
    <input
      className="ws-input"
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={label || placeholder}
    />
  </div>
);

/** Segmented filter, e.g. All / Pending / Approved / Rejected. */
export const Segmented = ({ options, value, onChange, label }) => (
  <div className="ws-segmented" role="group" aria-label={label}>
    {options.map((o) => (
      <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
        {o.label}
        {o.count != null && <span className="ws-count">{o.count}</span>}
      </button>
    ))}
  </div>
);

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="ws-empty">
    {Icon && (
      <div className="ws-empty-icon">
        <Icon size={22} aria-hidden="true" />
      </div>
    )}
    <h3>{title}</h3>
    {description && <p>{description}</p>}
    {action}
  </div>
);

export const ErrorState = ({ title = 'Something went wrong', message, onRetry }) => (
  <div className="ws-empty ws-error" role="alert">
    <div className="ws-empty-icon">
      <AlertTriangle size={22} aria-hidden="true" />
    </div>
    <h3>{title}</h3>
    <p>{message || 'We could not load this data.'}</p>
    {onRetry && (
      <Button variant="secondary" icon={RotateCcw} onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
);

export const Skeleton = ({ width = '100%', height = 14, style }) => (
  <span className="ws-skeleton" style={{ display: 'block', width, height, ...style }} aria-hidden="true" />
);

/** List-shaped skeleton matching .ws-list rows. */
export const ListSkeleton = ({ rows = 4 }) => (
  <div className="ws-list" aria-busy="true" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => (
      <div className="ws-row" key={i}>
        <Skeleton width={40} height={40} style={{ borderRadius: 10 }} />
        <div className="ws-row-main">
          <Skeleton width="40%" height={14} />
          <Skeleton width="25%" height={12} style={{ marginTop: 8 }} />
        </div>
        <Skeleton width={80} height={24} />
      </div>
    ))}
  </div>
);

/** Card-grid skeleton matching interview cards. */
export const CardGridSkeleton = ({ cards = 6 }) => (
  <div className="ws-grid" aria-busy="true" aria-label="Loading">
    {Array.from({ length: cards }).map((_, i) => (
      <div className="ws-card ws-card-pad" key={i}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Skeleton width={40} height={40} style={{ borderRadius: 10 }} />
          <div style={{ flex: 1 }}>
            <Skeleton width="55%" />
            <Skeleton width="35%" height={12} style={{ marginTop: 8 }} />
          </div>
        </div>
        <Skeleton height={40} style={{ marginTop: 20 }} />
        <Skeleton width="70%" height={12} style={{ marginTop: 16 }} />
      </div>
    ))}
  </div>
);

/** Catches render errors so a broken page never becomes a blank screen. */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI error boundary caught:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
          <ErrorState
            title="This page ran into a problem"
            message={this.state.error.message || 'An unexpected error occurred.'}
            onRetry={() => {
              this.setState({ error: null });
              this.props.onReset?.();
            }}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
