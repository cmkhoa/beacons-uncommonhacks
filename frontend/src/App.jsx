import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import CentralCommandMap from './components/stitch/CentralCommandMap';
import HospitalInventoryDashboard from './components/stitch/HospitalInventoryDashboard';
import SupplyMatchmakerRouting from './components/stitch/SupplyMatchmakerRouting';
import RegionalReadinessOverview from './components/stitch/RegionalReadinessOverview';
import NurseInputPage from './components/stitch/NurseInputPage';


import MapViewer from './components/MapViewer';

function App() {
  const [activeScreen, setActiveScreen] = useState('map');

  
  const [showSandboxMap, setShowSandboxMap] = useState(false);

  
  if (showSandboxMap) {
    return (
      <div style={{ position: 'relative' }}>
        <button 
          onClick={() => setShowSandboxMap(false)}
          style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 999, padding: '10px 15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ← Back to Main Dashboard
        </button>
        <MapViewer />
      </div>
    );
  }

  const renderScreen = () => {
    switch (activeScreen) {
      case 'map':
        return <CentralCommandMap isEmbedded />;
      case 'inventory':
        return <HospitalInventoryDashboard isEmbedded />;
      case 'matchmaker':
        return <SupplyMatchmakerRouting isEmbedded />;
      case 'readiness':
        return <RegionalReadinessOverview isEmbedded />;
      case 'nurse-input':
        return <NurseInputPage isEmbedded />;
      default:
        return <CentralCommandMap isEmbedded />;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-on-surface">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeScreen={activeScreen} onScreenChange={setActiveScreen} />
        <main className="flex-1 overflow-hidden relative bg-surface-bright">
          
          {/* 3. Tiny temporary developer floating anchor to toggle into your sandbox view */}
          <button 
            onClick={() => setShowSandboxMap(true)}
            style={{ position: 'absolute', bottom: '15px', right: '15px', zIndex: 99, padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🛠️ Open Sandbox Map
          </button>

          {renderScreen()}
        </main>
      </div>
    </div>
  );
}

export default App;