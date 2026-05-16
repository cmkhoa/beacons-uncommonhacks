import React from 'react';

const TopBar = () => {
  return (
    <header className="bg-surface flex justify-between items-center w-full px-4 md:px-8 h-16 border-b border-outline-variant z-50 shrink-0">
      <div className="flex items-center gap-6">
        <span className="text-2xl font-bold text-primary tracking-tight">Beacon</span>
        <div className="hidden md:flex items-center bg-surface-container-low rounded-full px-4 py-2 border border-outline-variant focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
          <span className="material-symbols-outlined text-on-surface-variant mr-2 text-[20px]">search</span>
          <input 
            className="bg-transparent border-none focus:ring-0 text-sm text-on-surface placeholder:text-on-surface-variant w-64 outline-none" 
            placeholder="Search region or hospital..." 
            type="text"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        <div className="flex items-center gap-1 bg-surface-container rounded-full px-3 py-1.5 md:mr-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider hidden sm:inline">Agent Online</span>
        </div>
        
        <button className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors relative active:scale-95">
          <span className="material-symbols-outlined">monitor_heart</span>
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface"></span>
        </button>
        
        <button className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-surface-container transition-colors active:scale-95 border border-transparent hover:border-outline-variant">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white text-xs font-bold shadow-sm">
            JD
          </div>
          <span className="text-sm font-semibold text-on-surface hidden md:inline">Nurse Jane</span>
        </button>
      </div>
    </header>
  );
};

export default TopBar;
