import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dispatcher from './components/Dispatcher';
import NurseInputPage from './components/stitch/NurseInputPage';
import AdminView from './components/AdminView';
import RoleLogin from './components/RoleLogin';

const ROLE_STORAGE_KEY = 'beacon.role';
const VALID_ROLES = ['nurse', 'dispatcher', 'admin'];

function App() {
  const [role, setRole] = useState(null);
  const [dispatcherTab, setDispatcherTab] = useState('map');

  useEffect(() => {
    const stored = localStorage.getItem(ROLE_STORAGE_KEY);
    if (stored && VALID_ROLES.includes(stored)) {
      setRole(stored);
    }
  }, []);

  const handleLogin = (nextRole) => {
    localStorage.setItem(ROLE_STORAGE_KEY, nextRole);
    setRole(nextRole);
  };

  const handleLogout = () => {
    localStorage.removeItem(ROLE_STORAGE_KEY);
    setRole(null);
    setDispatcherTab('map');
  };

  if (!role) {
    return <RoleLogin onLogin={handleLogin} />;
  }

  const renderView = () => {
    switch (role) {
      case 'nurse':
        return <NurseInputPage isEmbedded />;
      case 'admin':
        return <AdminView />;
      case 'dispatcher':
      default:
        return <Dispatcher tab={dispatcherTab} />;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-on-surface">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          role={role}
          dispatcherTab={dispatcherTab}
          onDispatcherTabChange={setDispatcherTab}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-hidden relative bg-surface-bright">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

export default App;
