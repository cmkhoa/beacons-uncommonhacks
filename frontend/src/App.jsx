import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dispatcher from './components/Dispatcher';
import NurseInputPage from './components/stitch/NurseInputPage';
import AdminView from './components/AdminView';
import RoleLogin from './components/RoleLogin';
import { getSession, setSession, clearSession } from './lib/session';

const VALID_ROLES = ['nurse', 'dispatcher', 'admin'];

function App() {
  const [session, setSessionState] = useState(null);
  const [dispatcherTab, setDispatcherTab] = useState('map');
  const [activeView, setActiveView] = useState('default');

  useEffect(() => {
    const stored = getSession();
    if (stored?.role && VALID_ROLES.includes(stored.role)) {
      if (stored.role === 'dispatcher' && stored.userId) {
        setSessionState({ ...stored, role: 'nurse' });
        setActiveView('visualization');
      } else {
        setSessionState(stored);
      }
    }
  }, []);

  const handleLogin = (nextSession) => {
    setSession(nextSession);
    setSessionState(nextSession);
    setActiveView('default');
  };

  const handleLogout = () => {
    clearSession();
    setSessionState(null);
    setDispatcherTab('map');
    setActiveView('default');
  };

  const handleOpenVisualization = () => {
    setActiveView('visualization');
  };

  const handleOpenNursePanel = () => {
    setActiveView('default');
  };

  if (!session) {
    return <RoleLogin onLogin={handleLogin} />;
  }

  const renderView = () => {
    if (activeView === 'visualization') {
      return <Dispatcher tab={dispatcherTab} />;
    }

    switch (session.role) {
      case 'nurse':
        return <NurseInputPage session={session} isEmbedded />;
      case 'admin':
        return <AdminView />;
      case 'dispatcher':
      default:
        return <Dispatcher tab={dispatcherTab} />;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-on-surface">
      <TopBar
        session={session}
        onLogout={handleLogout}
        onOpenVisualization={handleOpenVisualization}
        onOpenNursePanel={handleOpenNursePanel}
        isVisualizationOpen={activeView === 'visualization'}
      />
      <div className="flex flex-1 overflow-hidden">
        {(session.role !== 'nurse' || activeView === 'visualization') && (
          <Sidebar
            role={activeView === 'visualization' ? 'dispatcher' : session.role}
            session={session}
            dispatcherTab={dispatcherTab}
            onDispatcherTabChange={setDispatcherTab}
          />
        )}
        <main className="flex-1 overflow-hidden relative bg-surface-bright">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

export default App;
