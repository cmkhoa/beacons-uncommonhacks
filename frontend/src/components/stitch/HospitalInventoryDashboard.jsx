import React from 'react';

const HospitalInventoryDashboard = ({ isEmbedded = false }) => {
  return (
    <div className={`flex flex-col h-full overflow-hidden bg-surface-bright ${isEmbedded ? '' : 'h-screen'}`}>
      {/* Page Header & Summary Bar */}
      <header className="flex-shrink-0 px-6 md:px-10 py-8 border-b border-outline-variant bg-white flex flex-col md:flex-row md:justify-between md:items-end gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest">Facility Dashboard</span>
            <span className="text-on-surface-variant font-medium text-xs">Sector North-04</span>
          </div>
          <h2 className="text-3xl font-bold text-on-surface">Hospital Inventory</h2>
          <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
            Manage critical supplies and report shortages instantly. Autonomous agent is monitoring thresholds for automatic re-routing.
          </p>
        </div>
        
        {/* Readiness Score Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex items-center justify-between shadow-lg min-w-[280px]">
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Facility Readiness</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-primary">84</span>
              <span className="text-lg text-on-surface-variant font-medium">/ 100</span>
            </div>
          </div>
          <div className="h-16 w-16 rounded-full border-[6px] border-surface-container flex items-center justify-center relative shadow-inner">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path className="text-primary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="84, 100" strokeWidth="4" strokeLinecap="round"></path>
            </svg>
            <span className="material-symbols-outlined text-primary text-2xl fill-1">health_and_safety</span>
          </div>
        </div>
      </header>

      {/* Main Content: Table Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-xl">
            {/* Table Header */}
            <div className="bg-surface-container-low px-8 py-4 border-b border-outline-variant grid grid-cols-12 gap-4 items-center">
              <div className="col-span-5 md:col-span-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Item Designation</div>
              <div className="col-span-3 md:col-span-2 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Current Stock</div>
              <div className="col-span-4 md:col-span-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest text-center">System Status</div>
              <div className="hidden md:block md:col-span-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Manual Correction</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-surface-container">
              {/* Row: Optimal */}
              <div className="px-8 py-5 hover:bg-surface-bright transition-colors grid grid-cols-12 gap-4 items-center group">
                <div className="col-span-5 md:col-span-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-indigo-600 text-2xl">masks</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Hazmat Suits (Level A)</p>
                    <p className="text-[11px] text-on-surface-variant font-medium">Bio-containment Unit</p>
                  </div>
                </div>
                <div className="col-span-3 md:col-span-2 text-right font-mono text-base text-on-surface font-semibold">
                  142 <span className="text-on-surface-variant font-sans text-xs font-normal">units</span>
                </div>
                <div className="col-span-4 md:col-span-3 flex justify-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Optimal
                  </span>
                </div>
                <div className="hidden md:flex md:col-span-3 justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="w-9 h-9 rounded-lg border border-outline-variant flex items-center justify-center hover:bg-surface-container hover:border-primary text-on-surface-variant transition-all">
                    <span className="material-symbols-outlined text-[20px]">remove</span>
                  </button>
                  <input className="w-16 h-9 border border-outline-variant rounded-lg px-1 text-center font-mono text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="text" defaultValue="142" />
                  <button className="w-9 h-9 rounded-lg border border-outline-variant flex items-center justify-center hover:bg-surface-container hover:border-primary text-on-surface-variant transition-all">
                    <span className="material-symbols-outlined text-[20px]">add</span>
                  </button>
                </div>
              </div>

              {/* Row: Critical */}
              <div className="px-8 py-5 bg-red-50/30 hover:bg-red-50/50 transition-colors grid grid-cols-12 gap-4 items-center group">
                <div className="col-span-5 md:col-span-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center flex-shrink-0 shadow-sm animate-pulse">
                    <span className="material-symbols-outlined text-red-600 text-2xl fill-1">air</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Ventilators (Portable)</p>
                    <p className="text-[11px] text-on-surface-variant font-medium">Respiratory Support</p>
                  </div>
                </div>
                <div className="col-span-3 md:col-span-2 text-right font-mono text-base text-error font-bold">
                  04 <span className="text-on-surface-variant font-sans text-xs font-normal">units</span>
                </div>
                <div className="col-span-4 md:col-span-3 flex justify-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error text-white text-[11px] font-bold shadow-sm border border-error/20">
                    <span className="material-symbols-outlined text-[14px]">warning</span> Shortage
                  </span>
                </div>
                <div className="hidden md:flex md:col-span-3 justify-end gap-2">
                  <button className="w-9 h-9 rounded-lg border border-outline-variant flex items-center justify-center hover:bg-white hover:border-error text-on-surface-variant transition-all">
                    <span className="material-symbols-outlined text-[20px]">remove</span>
                  </button>
                  <input className="w-16 h-9 border border-error rounded-lg px-1 text-center font-mono text-sm text-error focus:ring-4 focus:ring-error/10 outline-none bg-white transition-all font-bold" type="text" defaultValue="04" />
                  <button className="w-9 h-9 rounded-lg border border-outline-variant flex items-center justify-center hover:bg-white hover:border-error text-on-surface-variant transition-all">
                    <span className="material-symbols-outlined text-[20px]">add</span>
                  </button>
                </div>
              </div>

              {/* Row: Surplus */}
              <div className="px-8 py-5 hover:bg-surface-bright transition-colors grid grid-cols-12 gap-4 items-center group">
                <div className="col-span-5 md:col-span-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-blue-600 text-2xl">medication</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Antibiotics</p>
                    <p className="text-[11px] text-on-surface-variant font-medium">IV Doses / 500mg</p>
                  </div>
                </div>
                <div className="col-span-3 md:col-span-2 text-right font-mono text-base text-on-surface font-semibold">
                  1,850 <span className="text-on-surface-variant font-sans text-xs font-normal">units</span>
                </div>
                <div className="col-span-4 md:col-span-3 flex justify-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container text-white text-[11px] font-bold shadow-sm">
                    <span className="material-symbols-outlined text-[14px]">arrow_upward</span> Surplus
                  </span>
                </div>
                <div className="hidden md:flex md:col-span-3 justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="w-9 h-9 rounded-lg border border-outline-variant flex items-center justify-center hover:bg-surface-container transition-all">
                    <span className="material-symbols-outlined text-[20px]">remove</span>
                  </button>
                  <input className="w-16 h-9 border border-outline-variant rounded-lg px-1 text-center font-mono text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="text" defaultValue="1850" />
                  <button className="w-9 h-9 rounded-lg border border-outline-variant flex items-center justify-center hover:bg-surface-container transition-all">
                    <span className="material-symbols-outlined text-[20px]">add</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="mt-10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface-container-low/50 p-4 rounded-2xl border border-dashed border-outline-variant">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant">info</span>
              <p className="text-xs text-on-surface-variant font-medium italic">Last manual sync: 14 minutes ago by Jane Doe</p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none px-8 py-3 rounded-xl border border-outline-variant bg-white text-on-surface-variant font-bold text-sm hover:bg-surface-container transition-all shadow-sm">
                Discard Changes
              </button>
              <button className="flex-1 sm:flex-none px-8 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:shadow-lg hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[20px]">sync</span>
                Commit to Network
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HospitalInventoryDashboard;
