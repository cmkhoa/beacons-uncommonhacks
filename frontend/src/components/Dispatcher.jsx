import React from 'react';
import CentralCommandMap from './stitch/CentralCommandMap';
import HospitalInventoryDashboard from './stitch/HospitalInventoryDashboard';
import SupplyMatchmakerRouting from './stitch/SupplyMatchmakerRouting';

const Dispatcher = ({ tab, session }) => {
  switch (tab) {
    case 'inventory':
      return <HospitalInventoryDashboard isEmbedded />;
    case 'matchmaker':
      return <SupplyMatchmakerRouting isEmbedded />;
    case 'map':
    default:
      return <CentralCommandMap isEmbedded />;
  }
};

export default Dispatcher;
