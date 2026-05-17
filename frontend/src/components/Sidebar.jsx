import React from 'react';

const DISPATCHER_TABS = [
  { id: 'map', label: 'Command Map', icon: 'map' },
  { id: 'inventory', label: 'Hospital Inventory', icon: 'inventory_2' },
  { id: 'matchmaker', label: 'Supply Matchmaker', icon: 'hub' },
  { id: 'readiness', label: 'Regional Readiness', icon: 'analytics' },
];

const Sidebar = ({ role, dispatcherTab, onDispatcherTabChange, onLogout }) => {
  return (
    <nav className="hidden md:flex flex-col h-full w-[280px] bg-surface border-r border-outline-variant p-4 gap-2 shrink-0 z-40">
      <div className="mb-6 px-2">
        <h2 className="font-semibold text-sm text-on-surface">System Overview</h2>
        <p className="text-xs text-on-surface-variant mt-1">All Sectors Active</p>
      </div>

      <div className="flex flex-col gap-1 flex-1">
        {role === 'dispatcher' &&
          DISPATCHER_TABS.map((item) => {
            const active = dispatcherTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onDispatcherTabChange(item.id)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 text-left ${
                  active
                    ? 'bg-secondary-container text-on-secondary-container font-bold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className={`material-symbols-outlined ${active ? 'fill-1' : ''}`}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <button className="w-full bg-error text-on-error py-3 rounded-lg text-sm font-semibold hover:bg-error-container hover:text-on-error-container transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2">
          <span className="material-symbols-outlined">warning</span>
          Dispatch Emergency
        </button>
        <div className="h-px bg-outline-variant w-full my-2"></div>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface text-sm rounded-lg w-full text-left"
        >
          <span className="material-symbols-outlined">switch_account</span>
          Switch role
        </button>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface text-sm rounded-lg w-full text-left"
        >
          <span className="material-symbols-outlined">logout</span>
          Sign out
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
