import React from 'react';

const Sidebar = ({ activeScreen, onScreenChange }) => {
  const navItems = [
    { id: 'map', label: 'Command Map', icon: 'map' },
    { id: 'inventory', label: 'Hospital Inventory', icon: 'inventory_2' },
    { id: 'matchmaker', label: 'Supply Matchmaker', icon: 'hub' },
    { id: 'readiness', label: 'Regional Readiness', icon: 'analytics' },
    { id: 'nurse-input', label: 'Rapid Input', icon: 'medical_services' },
  ];

  return (
    <nav className="hidden md:flex flex-col h-full w-[280px] bg-surface border-r border-outline-variant p-4 gap-2 shrink-0 z-40">
      <div className="mb-8 px-2">
        <h2 className="font-semibold text-sm text-on-surface">System Overview</h2>
        <p className="text-xs text-on-surface-variant mt-1">All Sectors Active</p>
      </div>
      
      <div className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onScreenChange(item.id)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
              activeScreen === item.id
                ? 'bg-secondary-container text-on-secondary-container font-bold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <span className={`material-symbols-outlined ${activeScreen === item.id ? 'fill-1' : ''}`}>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <button className="w-full bg-error text-on-error py-3 rounded-lg text-sm font-semibold hover:bg-error-container hover:text-on-error-container transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2">
          <span className="material-symbols-outlined">warning</span>
          Dispatch Emergency
        </button>
        <div className="h-px bg-outline-variant w-full my-2"></div>
        <button className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface text-sm rounded-lg w-full text-left">
          <span className="material-symbols-outlined">settings</span>
          Settings
        </button>
        <button className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface text-sm rounded-lg w-full text-left">
          <span className="material-symbols-outlined">help</span>
          Support
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;
