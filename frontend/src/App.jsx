import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import CentralCommandMap from './components/stitch/CentralCommandMap';
import HospitalInventoryDashboard from './components/stitch/HospitalInventoryDashboard';
import SupplyMatchmakerRouting from './components/stitch/SupplyMatchmakerRouting';
import RegionalReadinessOverview from './components/stitch/RegionalReadinessOverview';
import NurseInputPage from './components/stitch/NurseInputPage';

function App() {
  const [activeScreen, setActiveScreen] = useState('map');

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
          {renderScreen()}
        </main>
      </div>
    </div>
  );
}

export default App;