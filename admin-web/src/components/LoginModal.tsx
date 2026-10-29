import React, { useState } from 'react';
import { ApiService } from '../api';
import { AdminUser } from '../types';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  Landmark, 
  Building2, 
  School as SchoolIcon,
  Sparkles
} from 'lucide-react';

interface LoginModalProps {
  onLoggedIn: (admin: AdminUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoggedIn }) => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (emailVal: string, passwordVal: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await ApiService.login(emailVal, passwordVal);
      onLoggedIn(res.admin);
    } catch (err: any) {
      setError(err.message || 'Invalid administrative credentials.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(emailOrUsername, password);
  };

  const quickDemoLogin = (email: string) => {
    setEmailOrUsername(email);
    setPassword('admin123456');
    handleLogin(email, 'admin123456');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: 'var(--bg-app)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 480,
        backgroundColor: '#ffffff',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xl)',
        padding: '36px 32px',
      }}>
        {/* Brand Icon & Heading */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: '#0f172a',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
            boxShadow: 'var(--shadow-md)',
          }}>
            <ShieldCheck size={30} color="#10b981" />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            AI Attendance Administration
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
            State, District & School Tier Administrative Portals
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            backgroundColor: 'var(--accent-rose-subtle)',
            border: '1px solid var(--accent-rose-border)',
            borderRadius: 8,
            marginBottom: 20,
            color: 'var(--accent-rose)',
            fontSize: '0.825rem',
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Administrator Email or Username
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#64748b" style={{ position: 'absolute', left: 12, top: 12 }} />
              <input
                type="text"
                required
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="e.g. stateadmin@attendance.gov"
                className="input-field"
                style={{ paddingLeft: 38 }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#64748b" style={{ position: 'absolute', left: 12, top: 12 }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="input-field"
                style={{ paddingLeft: 38 }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '0.9rem' }}
          >
            <span>{loading ? 'Authenticating…' : 'Sign in to Admin Dashboard'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* ONE-CLICK DEMO LOGIN PRESETS */}
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
            <Sparkles size={14} color="#d97706" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              One-Click Demo Portals
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              onClick={() => quickDemoLogin('stateadmin@attendance.gov')}
              disabled={loading}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-light)',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                color: 'var(--text-main)',
                fontWeight: 600,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Landmark size={15} color="#d97706" />
                <span>Log in as <strong>State Admin</strong></span>
              </div>
              <span className="pill pill-amber" style={{ fontSize: '0.7rem' }}>Full State & Coordinates</span>
            </button>

            <button
              type="button"
              onClick={() => quickDemoLogin('districtadmin@attendance.gov')}
              disabled={loading}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-light)',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                color: 'var(--text-main)',
                fontWeight: 600,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={15} color="#0f172a" />
                <span>Log in as <strong>District Admin</strong></span>
              </div>
              <span className="pill pill-slate" style={{ fontSize: '0.7rem' }}>Bhopal District</span>
            </button>

            <button
              type="button"
              onClick={() => quickDemoLogin('schooladmin@attendance.gov')}
              disabled={loading}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-light)',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                color: 'var(--text-main)',
                fontWeight: 600,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SchoolIcon size={15} color="#059669" />
                <span>Log in as <strong>School Admin</strong></span>
              </div>
              <span className="pill pill-emerald" style={{ fontSize: '0.7rem' }}>Metropolitan Academy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
