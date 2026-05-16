import React from 'react';

const RegionalReadinessOverview = ({ isEmbedded = false }) => {
  return (
    <div className={`flex flex-col h-full overflow-hidden bg-surface-bright ${isEmbedded ? '' : 'h-screen'}`}>
      {/* Page Header */}
      <header className="flex-shrink-0 px-6 md:px-10 py-8 border-b border-outline-variant bg-white flex flex-col md:flex-row md:justify-between md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-bold text-on-surface tracking-tight">Regional Readiness</h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
            Real-time network resilience metrics across all active sectors. Autonomous agents are monitoring supply trends to prevent regional outages.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-on-surface border border-outline-variant rounded-xl hover:bg-surface-container transition-all text-sm font-bold shadow-sm">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Analytics
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:shadow-lg hover:opacity-90 transition-all text-sm font-bold shadow-md">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            Zone Configuration
          </button>
        </div>
      </header>

      {/* Main Analytics Canvas */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
        <div className="max-w-[1400px] mx-auto space-y-8">
          
          {/* KPI Bento Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white border border-outline-variant rounded-2xl p-6 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Avg Network Health</span>
                <div className="p-2 bg-primary/5 rounded-lg group-hover:bg-primary group-hover:text-white transition-all">
                  <span className="material-symbols-outlined text-[20px] fill-1">speed</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-on-surface tracking-tighter">84%</span>
                <span className="text-xs font-bold text-emerald-600 flex items-center bg-emerald-50 px-1.5 py-0.5 rounded">
                  <span className="material-symbols-outlined text-[14px]">arrow_upward</span> 2.4%
                </span>
              </div>
            </div>
            
            <div className="bg-white border border-outline-variant rounded-2xl p-6 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">At-Risk Nodes</span>
                <div className="p-2 bg-red-50 rounded-lg group-hover:bg-error group-hover:text-white transition-all">
                  <span className="material-symbols-outlined text-[20px] fill-1">warning</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-on-surface tracking-tighter">03</span>
                <span className="text-[10px] font-bold text-error uppercase tracking-tight bg-red-50 px-2 py-0.5 rounded border border-red-100">Critical Status</span>
              </div>
            </div>

            <div className="bg-white border border-outline-variant rounded-2xl p-6 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Active Transfers</span>
                <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <span className="material-symbols-outlined text-[20px] fill-1">local_shipping</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-on-surface tracking-tighter">12</span>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-tight bg-blue-50 px-2 py-0.5 rounded border border-blue-100">In Transit</span>
              </div>
            </div>

            <div className="bg-white border border-outline-variant rounded-2xl p-6 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">System Integrity</span>
                <div className="p-2 bg-secondary/5 rounded-lg group-hover:bg-secondary group-hover:text-white transition-all">
                  <span className="material-symbols-outlined text-[20px] fill-1">shield</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-on-surface tracking-tighter uppercase">Optimal</span>
              </div>
            </div>
          </div>

          {/* Leaderboard and Trends Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Hospital Readiness Leaderboard */}
            <div className="lg:col-span-8 bg-white border border-outline-variant rounded-2xl flex flex-col overflow-hidden shadow-xl">
              <div className="bg-surface-container-low px-8 py-5 border-b border-outline-variant flex justify-between items-center">
                <h3 className="text-lg font-bold text-on-surface">Regional Leaderboard</h3>
                <div className="flex gap-2">
                  <button className="px-4 py-1.5 bg-white border border-outline-variant rounded-lg text-[10px] font-bold text-on-surface-variant hover:bg-surface-container transition-all uppercase tracking-widest">Sector A-1</button>
                  <button className="px-4 py-1.5 bg-white border border-outline-variant rounded-lg text-[10px] font-bold text-on-surface-variant hover:bg-surface-container transition-all uppercase tracking-widest">Sector B-2</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-bright/50 border-b border-outline-variant">
                      <th className="px-8 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Facility Name</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Sector</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Score</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Live Status</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Intervention</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    <tr className="hover:bg-surface-bright transition-colors group">
                      <td className="px-8 py-5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary-container text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-110 transition-transform">MG</div>
                        <span className="font-bold text-on-surface">Mercy General</span>
                      </td>
                      <td className="px-6 py-5 text-on-surface-variant font-medium text-sm">North</td>
                      <td className="px-6 py-5 font-mono text-base font-bold text-on-surface">98%</td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase border border-emerald-100">Optimal</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="text-primary hover:underline text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">View Details</button>
                      </td>
                    </tr>
                    <tr className="hover:bg-red-50/20 transition-colors group bg-red-50/10">
                      <td className="px-8 py-5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-error text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-110 transition-transform">CM</div>
                        <span className="font-bold text-error">City Memorial</span>
                      </td>
                      <td className="px-6 py-5 text-on-surface-variant font-medium text-sm">South</td>
                      <td className="px-6 py-5 font-mono text-base font-bold text-error">45%</td>
                      <td className="px-6 py-5 flex items-center gap-1">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 text-[10px] font-bold uppercase border border-red-200 shadow-sm animate-pulse">Critical</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="text-error hover:underline text-xs font-bold">Intervene</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Trends and Map Sidebar */}
            <div className="lg:col-span-4 flex flex-col gap-8">
              {/* Supply Trend Visualization */}
              <div className="bg-white border border-outline-variant rounded-2xl flex flex-col overflow-hidden h-72 shadow-xl">
                <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant flex justify-between items-center">
                  <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest">Regional Trend</h3>
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">trending_up</span>
                </div>
                <div className="flex-1 p-6 flex flex-col justify-end relative bg-white overflow-hidden">
                  <div className="absolute inset-0 flex items-end justify-between px-8 pb-10 pt-16 gap-3 opacity-60">
                    <div className="w-full bg-primary/10 rounded-t-lg h-[40%] hover:h-[45%] transition-all cursor-help"></div>
                    <div className="w-full bg-primary/20 rounded-t-lg h-[60%] hover:h-[65%] transition-all cursor-help"></div>
                    <div className="w-full bg-primary rounded-t-lg h-[85%] hover:h-[90%] transition-all cursor-help"></div>
                    <div className="w-full bg-error rounded-t-lg h-[30%] hover:h-[35%] transition-all cursor-help"></div>
                    <div className="w-full bg-primary/40 rounded-t-lg h-[50%] hover:h-[55%] transition-all cursor-help"></div>
                  </div>
                  <div className="relative z-10 flex justify-between items-end w-full border-t border-outline-variant pt-3">
                    <span className="text-[10px] font-bold text-on-surface-variant">MON</span>
                    <span className="text-[10px] font-bold text-on-surface-variant">WED</span>
                    <span className="text-[10px] font-bold text-on-surface-variant">FRI</span>
                  </div>
                </div>
              </div>

              {/* At-Risk Mini Map */}
              <div className="bg-white border border-outline-variant rounded-2xl flex flex-col overflow-hidden h-72 relative shadow-xl group">
                <div className="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-md px-6 py-4 border-b border-outline-variant flex justify-between items-center z-20">
                  <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest">Critical Sectors</h3>
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px] group-hover:rotate-180 transition-transform duration-700">refresh</span>
                </div>
                <div className="absolute inset-0 w-full h-full bg-indigo-50/30">
                  <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(#CBD5E1 1.5px, transparent 1.5px)", backgroundSize: "32px 32px" }}></div>
                  <div className="absolute top-[50%] left-[50%] flex flex-col items-center">
                    <div className="w-6 h-6 bg-error rounded-full ring-8 ring-red-100 animate-ping absolute"></div>
                    <div className="w-6 h-6 bg-error rounded-full border-2 border-white shadow-lg relative z-10"></div>
                    <div className="mt-2 px-3 py-1.5 bg-white text-error text-[10px] font-bold rounded-lg border border-red-200 shadow-2xl whitespace-nowrap uppercase tracking-widest">
                      South Sector Alert
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RegionalReadinessOverview;
