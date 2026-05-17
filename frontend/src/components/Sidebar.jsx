import React from 'react';

const DISPATCHER_TABS = [
  { id: 'map', label: 'Transfer Map', icon: 'map' },
  { id: 'inventory', label: 'Hospital Inventory', icon: 'inventory_2' },
  { id: 'matchmaker', label: 'Supply Matchmaker', icon: 'hub' },
];

const Sidebar = ({ role, session, dispatcherTab, onDispatcherTabChange }) => {
  return (
    <nav className="hidden md:flex flex-col h-full w-[280px] bg-surface border-r border-outline-variant p-4 gap-2 shrink-0 z-40">
      {role === 'dispatcher' ? (
        <DispatcherNav
          dispatcherTab={dispatcherTab}
          onDispatcherTabChange={onDispatcherTabChange}
        />
      ) : (
        <div className="flex-1" />
      )}

    </nav>
  );
};

function DispatcherNav({ dispatcherTab, onDispatcherTabChange }) {
  return (
    <div className="flex flex-col gap-1 flex-1">
      {DISPATCHER_TABS.map((item) => {
        const active = dispatcherTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
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
  );
}

export default Sidebar;
