import React, { useState, useEffect } from 'react';
import { AdminUser, AdminRole } from './types';
import { ApiService } from './api';
import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { StateAdminView } from './components/StateAdminView';
import { DistrictAdminView } from './components/DistrictAdminView';
import { SchoolAdminView } from './components/SchoolAdminView';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => ApiService.getAdminUser());
  const [switchingRole, setSwitchingRole] = useState(false);

  useEffect(() => {
    const handleUnauthorized = () => {
      setCurrentUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const handleLogout = () => {
    ApiService.logout();
    setCurrentUser(null);
  };

  const handleQuickSwitchRole = async (targetRole: AdminRole) => {
    setSwitchingRole(true);
    let email = 'stateadmin@attendance.gov';
    if (targetRole === 'district_admin') email = 'districtadmin@attendance.gov';
    if (targetRole === 'school_admin') email = 'schooladmin@attendance.gov';

    try {
      const res = await ApiService.login(email, 'admin123456');
      setCurrentUser(res.admin);
    } catch (err) {
      console.error('Failed to switch role:', err);
    } finally {
      setSwitchingRole(false);
    }
  };

  if (!currentUser) {
    return <LoginModal onLoggedIn={(admin) => setCurrentUser(admin)} />;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      <Header
        user={currentUser}
        onLogout={handleLogout}
        onQuickSwitchRole={handleQuickSwitchRole}
        loadingRoleSwitch={switchingRole}
      />

      <main style={{ maxWidth: 1380, margin: '0 auto', padding: '0 24px' }}>
        {(currentUser.role === 'state_admin' || currentUser.role === 'admin') && (
          <StateAdminView />
        )}

        {currentUser.role === 'district_admin' && (
          <DistrictAdminView user={currentUser} />
        )}

        {currentUser.role === 'school_admin' && (
          <SchoolAdminView user={currentUser} />
        )}
      </main>
    </div>
  );
};

export default App;
