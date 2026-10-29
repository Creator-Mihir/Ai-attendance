import React, { useState } from 'react';
import { AdminUser, AdminRole } from '../types';
import { 
  ShieldCheck, 
  Building2, 
  School as SchoolIcon, 
  Landmark, 
  LogOut, 
  ChevronDown, 
  Sparkles,
  Server
} from 'lucide-react';

interface HeaderProps {
  user: AdminUser;
  onLogout: () => void;
  onQuickSwitchRole: (role: AdminRole) => void;
  loadingRoleSwitch?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onQuickSwitchRole,
  loadingRoleSwitch = false,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const getRoleBadge = (role: AdminRole) => {
    switch (role) {
      case 'state_admin':
      case 'admin':
        return (
          <span className="pill pill-amber" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
            <Landmark size={14} /> State Admin Portal (Statewide)
          </span>
        );
      case 'district_admin':
        return (
          <span className="pill pill-slate" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
            <Building2 size={14} /> District Admin ({user.jurisdictionDistrictId || 'District'})
          </span>
        );
      case 'school_admin':
        return (
          <span className="pill pill-emerald" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
            <SchoolIcon size={14} /> School Admin (Campus Level)
          </span>
        );
      default:
        return (
          <span className="pill pill-slate">
            <ShieldCheck size={14} /> Administrator
          </span>
        );
    }
  };

  return (
    <header style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid var(--border-light)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{
        maxWidth: 1380,
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        {/* Brand & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <ShieldCheck size={22} color="#10b981" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                AI Attendance Admin
              </h1>
              <span style={{
                fontSize: '0.7rem',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-muted)',
                padding: '2px 8px',
                borderRadius: 999,
                fontWeight: 600
              }}>
                v2.0
              </span>
            </div>
            <p style={{ fontSize: '0.785rem', color: 'var(--text-muted)' }}>
              Facial Biometric & Geofence Intelligence Administration
            </p>
          </div>
        </div>

        {/* Center: Current Role Badge & Quick Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {getRoleBadge(user.role)}

          {/* Quick Role Switcher Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              disabled={loadingRoleSwitch}
              className="btn-secondary"
              style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: 999 }}
              title="Quickly switch between admin roles to preview permissions"
            >
              <Sparkles size={14} color="#d97706" />
              <span>Switch Tier</span>
              <ChevronDown size={14} />
            </button>

            {showRoleMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 8,
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '6px',
                width: 250,
                zIndex: 100,
              }}>
                <div style={{ padding: '6px 10px', fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Select Administrative Tier
                </div>
                
                <button
                  onClick={() => { onQuickSwitchRole('state_admin'); setShowRoleMenu(false); }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: '0.825rem',
                    color: user.role === 'state_admin' ? '#d97706' : 'var(--text-main)',
                    fontWeight: user.role === 'state_admin' ? 700 : 500,
                    backgroundColor: user.role === 'state_admin' ? 'var(--accent-amber-subtle)' : 'transparent',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = user.role === 'state_admin' ? 'var(--accent-amber-subtle)' : 'transparent')}
                >
                  <Landmark size={16} />
                  <div>
                    <div>State Admin</div>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Statewide, School Coords & Transfers</small>
                  </div>
                </button>

                <button
                  onClick={() => { onQuickSwitchRole('district_admin'); setShowRoleMenu(false); }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: '0.825rem',
                    color: user.role === 'district_admin' ? '#0f172a' : 'var(--text-main)',
                    fontWeight: user.role === 'district_admin' ? 700 : 500,
                    backgroundColor: user.role === 'district_admin' ? 'var(--bg-subtle)' : 'transparent',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = user.role === 'district_admin' ? 'var(--bg-subtle)' : 'transparent')}
                >
                  <Building2 size={16} />
                  <div>
                    <div>District Admin</div>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Bhopal District Schools</small>
                  </div>
                </button>

                <button
                  onClick={() => { onQuickSwitchRole('school_admin'); setShowRoleMenu(false); }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: '0.825rem',
                    color: user.role === 'school_admin' ? '#059669' : 'var(--text-main)',
                    fontWeight: user.role === 'school_admin' ? 700 : 500,
                    backgroundColor: user.role === 'school_admin' ? 'var(--accent-emerald-subtle)' : 'transparent',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = user.role === 'school_admin' ? 'var(--accent-emerald-subtle)' : 'transparent')}
                >
                  <SchoolIcon size={16} />
                  <div>
                    <div>School Admin</div>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Metropolitan Science Academy</small>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: User Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {user.fullName || user.email}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {user.email}
            </div>
          </div>

          <button
            onClick={onLogout}
            className="btn-secondary"
            style={{ padding: '7px 12px', fontSize: '0.8rem' }}
            title="Sign out of administration"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
