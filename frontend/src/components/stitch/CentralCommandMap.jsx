import React, { useState } from 'react';
import MapViewer from '../MapViewer';

const CentralCommandMap = ({ isEmbedded = false }) => {
  const [expanded, setExpanded] = useState(null);
  const toggle = (card) => setExpanded(prev => prev === card ? null : card);

  return (
    <div className={`flex flex-col lg:flex-row h-full overflow-hidden relative ${isEmbedded ? '' : 'h-screen'}`}>
      {/* Map Canvas */}
      <div className="flex-1 relative bg-surface-container-low h-full flex flex-col min-h-0">
        {/* Map Overlay Metrics */}
        <div className="absolute top-4 left-4 z-10 flex gap-3 flex-wrap pointer-events-none">
          {/* Regional Readiness card */}
          <div
            onClick={() => toggle('readiness')}
            className="bg-surface/90 backdrop-blur-md border border-outline-variant rounded-xl shadow-lg pointer-events-auto cursor-pointer select-none transition-all duration-300 overflow-hidden"
            style={{ width: expanded === 'readiness' ? '220px' : '110px' }}
          >
            {expanded === 'readiness' ? (
              <div className="p-5">
                <div className="flex items-center gap-2 text-on-surface-variant mb-1">
                  <span className="material-symbols-outlined text-[20px] text-primary">health_and_safety</span>
                  <span className="text-[11px] uppercase font-bold tracking-widest">Regional Readiness</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-on-surface">84%</span>
                  <span className="text-xs text-emerald-600 mb-2 flex items-center font-bold">
                    <span className="material-symbols-outlined text-[16px]">arrow_upward</span> 2%
                  </span>
                </div>
                <div className="w-full bg-surface-variant h-1.5 rounded-full mt-4 overflow-hidden">
                  <div className="bg-primary-container h-full rounded-full transition-all duration-1000" style={{ width: '84%' }}></div>
                </div>
              </div>
            ) : (
              <div className="p-3 flex flex-col items-center">
                <span className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant mb-1">Readiness</span>
                <span className="text-2xl font-bold text-on-surface">84%</span>
                <div className="w-full bg-surface-variant h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-primary-container h-full rounded-full" style={{ width: '84%' }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Active Shortages card */}
          <div
            onClick={() => toggle('shortages')}
            className="bg-surface/90 backdrop-blur-md border border-outline-variant rounded-xl shadow-lg pointer-events-auto cursor-pointer select-none transition-all duration-300 overflow-hidden"
            style={{ width: expanded === 'shortages' ? '220px' : '110px' }}
          >
            {expanded === 'shortages' ? (
              <div className="p-5">
                <div className="flex items-center gap-2 text-on-surface-variant mb-1">
                  <span className="material-symbols-outlined text-[20px] text-error">bloodtype</span>
                  <span className="text-[11px] uppercase font-bold tracking-widest">Active Shortages</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-error">1</span>
                  <span className="text-xs text-on-surface-variant mb-2 font-medium">Critical Facility</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter">Blood</span>
                  <span className="bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter">Life Support</span>
                  <span className="bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter">PPE</span>
                  <span className="bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter">Medication</span>
                </div>
              </div>
            ) : (
              <div className="p-3 flex flex-col items-center">
                <span className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant mb-1">Shortages</span>
                <span className="text-2xl font-bold text-error">1</span>
                <span className="text-[9px] text-on-surface-variant mt-1">Critical Facility</span>
              </div>
            )}
          </div>
        </div>

        {/* Map Viewport */}
        <div className="w-full h-full relative overflow-hidden">
          <MapViewer />
        </div>
      </div>

      {/* Right Sidebar: Alert Feed */}
      <aside className="w-full lg:w-[380px] bg-surface border-l border-outline-variant h-full flex flex-col shrink-0 z-30 shadow-[-10px_0_25px_-10px_rgba(0,0,0,0.08)]">
        <div className="p-6 border-b border-outline-variant bg-surface-container-lowest flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-on-surface">Mission Log</h3>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-0.5">Real-time Intelligence</p>
          </div>
          <span className="bg-error-container text-on-error-container text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-error/10">
            <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
            Live
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-surface-bright/50 custom-scrollbar">
          <div className="bg-surface border border-error-container rounded-xl p-4 shadow-sm hover:shadow-md hover:border-error transition-all cursor-pointer relative overflow-hidden group">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-error group-hover:w-1.5 transition-all"></div>
            <div className="flex justify-between items-start mb-3 pl-2">
              <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded border border-red-200 uppercase tracking-tight">Critical Shortage</span>
              <span className="font-mono text-[11px] text-on-surface-variant font-medium">02m ago</span>
            </div>
            <h4 className="font-bold text-sm text-on-surface pl-2 mb-1">Mercy General Hospital</h4>
            <p className="text-[13px] leading-relaxed text-on-surface-variant pl-2 mb-4">O-Negative blood supply depleted. Requesting immediate transfer from regional hubs.</p>
            <div className="pl-2 flex gap-2">
              <button className="bg-primary text-white text-[11px] font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-sm">Execute Match</button>
              <button className="bg-white text-on-surface-variant border border-outline-variant text-[11px] font-bold px-3 py-2 rounded-lg hover:bg-surface-container transition-colors">Ignore</button>
            </div>
          </div>

          <div className="bg-surface border border-outline-variant rounded-xl p-4 shadow-sm hover:shadow-md hover:border-amber-500 transition-all cursor-pointer relative overflow-hidden group">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 group-hover:w-1.5 transition-all"></div>
            <div className="flex justify-between items-start mb-3 pl-2">
              <span className="bg-yellow-50 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-200 uppercase tracking-tight">Elevated Demand</span>
              <span className="font-mono text-[11px] text-on-surface-variant font-medium">12m ago</span>
            </div>
            <h4 className="font-bold text-sm text-on-surface pl-2 mb-1">St. Jude Medical Center</h4>
            <p className="text-[13px] leading-relaxed text-on-surface-variant pl-2">Ventilator usage at 85% capacity. Pre-emptive sourcing recommended by autonomous agent.</p>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default CentralCommandMap;
