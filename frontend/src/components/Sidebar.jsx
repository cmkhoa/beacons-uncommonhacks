import React from 'react';

const DISPATCHER_TABS = [
  { id: 'map', label: 'Transfer Map', icon: 'map' },
  { id: 'inventory', label: 'Hospital Inventory', icon: 'inventory_2' },
  { id: 'matchmaker', label: 'Volunteer Supply', icon: 'hub' },
  { id: 'readiness', label: 'Regional Analytics', icon: 'health_and_safety' },
];

const Sidebar = ({
  role,
  session,
  dispatcherTab,
  onDispatcherTabChange,
  collapsed = false,
}) => {
  return (
    <nav
      className={`hidden md:flex flex-col h-full bg-surface border-r border-outline-variant gap-2 z-40 overflow-hidden transition-[flex-basis,padding,border-width] duration-300 ease-in-out ${
        collapsed
          ? 'basis-0 min-w-0 max-w-0 border-r-0 p-0'
          : 'basis-[280px] min-w-[280px] max-w-[280px] p-4'
      }`}
    >
      <div className="w-[248px]">
        {role === 'dispatcher' ? (
          <DispatcherNav
            dispatcherTab={dispatcherTab}
            onDispatcherTabChange={onDispatcherTabChange}
          />
        ) : (
          <div className="flex-1" />
        )}
      </div>

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
            <span className={`material-symbols-outlined text-[20px] ${active ? 'fill-1' : ''}`}>
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
