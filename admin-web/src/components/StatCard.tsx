import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: {
    text: string;
    type?: 'emerald' | 'amber' | 'rose' | 'slate';
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badge,
}) => {
  return (
    <div className="white-card" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {title}
        </span>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          backgroundColor: 'var(--bg-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-main)',
        }}>
          {icon}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
          {value}
        </span>
        {badge && (
          <span className={`pill pill-${badge.type || 'emerald'}`}>
            {badge.text}
          </span>
        )}
      </div>

      {subtitle && (
        <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: 6 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
};
