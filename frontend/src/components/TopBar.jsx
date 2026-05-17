import React, { useState } from 'react';
import { initialsFromName } from '../lib/session';

const TopBar = ({
  session,
  onLogout,
  onOpenVisualization,
  onOpenNursePanel,
  onGoToTransferMap,
  isVisualizationOpen = false,
  canToggleSidebar = false,
  isSidebarCollapsed = false,
  onToggleSidebar,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName =
    session?.userName
      ? session.userName
      : session?.role === 'admin'
        ? 'Admin'
        : 'Beacon User';

  const subtitle =
    session?.hospitalName
      ? session.hospitalName
      : null;

  const initials = initialsFromName(displayName);

  return (
    <header className="bg-surface flex justify-between items-center w-full px-4 md:px-8 h-16 border-b border-outline-variant z-50 shrink-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onGoToTransferMap}
          className="text-lg font-bold text-primary tracking-tight hover:opacity-80 transition-opacity cursor-pointer"
          title="Go to Transfer Map"
        >
          Beacon
        </button>
        {canToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            title={isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            aria-label={isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isSidebarCollapsed ? 'menu_open' : 'menu'}
            </span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 p-1 pr-3 rounded-full border border-transparent hover:bg-surface-container transition-colors"
          >
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {initials}
          </div>
          <div className="hidden md:block text-left">
            <span className="text-sm font-semibold text-on-surface block leading-tight">
              {displayName}
            </span>
            {subtitle && (
              <span className="text-xs text-on-surface-variant block leading-tight">
                {subtitle}
              </span>
            )}
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
            expand_more
          </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 w-44 rounded-xl border border-outline-variant bg-white shadow-lg p-1 z-50">
              {session?.role === 'nurse' && !isVisualizationOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenVisualization();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface text-left"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    hub
                  </span>
                  Visualization Tool
                </button>
              )}
              {isVisualizationOpen && session?.userId && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenNursePanel();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface text-left"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    medical_services
                  </span>
                  Nurse Panel
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface text-left"
              >
                <span className="material-symbols-outlined text-[18px]">
                  logout
                </span>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
