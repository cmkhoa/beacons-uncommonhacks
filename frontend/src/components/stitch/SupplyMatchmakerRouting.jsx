import React from 'react';

const SupplyMatchmakerRouting = ({ isEmbedded = false }) => {
  return (
    <div className={`flex flex-col h-full overflow-hidden bg-background ${isEmbedded ? '' : 'h-screen'}`}>
      {/* Header Area */}
      <header className="flex-shrink-0 px-6 md:px-10 py-6 md:py-8 border-b border-outline-variant bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-on-surface-variant text-[10px] font-bold uppercase tracking-widest mb-1">
            <button className="hover:text-primary flex items-center gap-1 transition-colors group">
              <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-1 transition-transform">arrow_back</span> Back to List
            </button>
            <span className="text-outline">/</span>
            <span className="text-secondary">Mission Match #842</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-on-background tracking-tight">Supply Routing & Match</h2>
        </div>
        <div className="flex items-center">
          <div className="flex flex-col items-end">
            <span className="px-4 py-1.5 bg-primary-container text-white rounded-full text-[11px] font-bold shadow-sm border border-primary/20">
              Match Confidence: 98%
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium mt-1">Calculated by Beacon AI Agent</span>
          </div>
        </div>
      </header>

      {/* Content Canvas */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Left Column: Match Details */}
          <div className="xl:col-span-8 space-y-8">
            
            {/* Comparison Panel */}
            <div className="bg-white border border-outline-variant rounded-2xl flex flex-col md:flex-row overflow-hidden shadow-xl">
              {/* Requester */}
              <div className="flex-1 p-8 border-b md:border-b-0 md:border-r border-outline-variant">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
                    <span className="material-symbols-outlined text-error text-xl fill-1">local_hospital</span>
                  </div>
                  <span className="text-[11px] font-bold text-secondary uppercase tracking-widest">Requesting Facility</span>
                </div>
                <h3 className="text-2xl font-bold text-on-background mb-1">St. Jude Medical Center</h3>
                <p className="text-sm text-on-surface-variant mb-8 leading-relaxed">
                  Urgent fulfillment required within <span className="text-error font-bold underline">4 hours</span>. Current local stock is critical.
                </p>
                <div className="bg-red-50/50 rounded-2xl p-6 border border-red-100/50 relative overflow-hidden group hover:bg-red-50 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="material-symbols-outlined text-6xl">warning</span>
                  </div>
                  <div className="text-[10px] font-bold mb-2 text-red-700 uppercase tracking-widest">Inventory Deficit</div>
                  <div className="flex items-end justify-between">
                    <div className="text-5xl font-bold text-red-600 tracking-tighter">50x</div>
                    <div className="text-sm font-semibold text-red-700/70 pb-2">Hazmat Suits (Level A)</div>
                  </div>
                </div>
              </div>
              
              {/* Donor */}
              <div className="flex-1 p-8 bg-surface-container-lowest/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                    <span className="material-symbols-outlined text-primary text-xl fill-1">inventory</span>
                  </div>
                  <span className="text-[11px] font-bold text-secondary uppercase tracking-widest">Fulfilling Facility</span>
                </div>
                <h3 className="text-2xl font-bold text-on-background mb-1">Mercy General West</h3>
                <p className="text-sm text-on-surface-variant mb-8 leading-relaxed">
                  Surplus verified by local agent. Capacity remains optimal after fulfillment.
                </p>
                <div className="bg-white rounded-2xl p-6 border border-outline-variant shadow-inner">
                  <div className="text-[10px] font-bold mb-2 text-secondary uppercase tracking-widest">Allocated Surplus</div>
                  <div className="flex items-end justify-between">
                    <div className="text-5xl font-bold text-primary tracking-tighter">50x</div>
                    <div className="text-sm font-semibold text-on-surface-variant pb-2">Hazmat Suits (Level A)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Logistics Protocol Table */}
            <div className="bg-white border border-outline-variant rounded-2xl p-8 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-[11px] font-bold text-secondary uppercase tracking-widest">Logistics & Compliance Protocol</h4>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded border border-emerald-100 uppercase">Pre-Verified</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant text-on-surface-variant">
                      <th className="py-3 font-bold text-[11px] uppercase tracking-wider">Transport Parameter</th>
                      <th className="py-3 font-bold text-[11px] uppercase tracking-wider">Assigned Value</th>
                      <th className="py-3 font-bold text-[11px] uppercase tracking-wider text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    <tr className="hover:bg-surface-bright transition-colors">
                      <td className="py-5 font-medium text-on-surface">Vehicle Assignment</td>
                      <td className="py-5 font-mono text-primary font-semibold">MED-TRANS-04 (Sprinter)</td>
                      <td className="py-5 text-right"><span className="bg-surface-container px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase">On Standby</span></td>
                    </tr>
                    <tr className="hover:bg-surface-bright transition-colors">
                      <td className="py-5 font-medium text-on-surface">Storage Requirement</td>
                      <td className="py-5 font-medium text-on-surface-variant">Standard Dry / Ambient (20°C)</td>
                      <td className="py-5 text-right"><span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-emerald-100">Sensor-Ok</span></td>
                    </tr>
                    <tr className="hover:bg-surface-bright transition-colors">
                      <td className="py-5 font-medium text-on-surface">Digital Chain of Custody</td>
                      <td className="py-5 font-mono text-on-surface-variant">AuthID: MERCER-772-B</td>
                      <td className="py-5 text-right"><span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-emerald-100">Signed Off</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Routing & Actions */}
          <div className="xl:col-span-4 flex flex-col gap-8 min-h-0">
            {/* Map / Routing Card */}
            <div className="bg-white border border-outline-variant rounded-2xl flex flex-col min-h-[360px] xl:flex-1 overflow-hidden relative shadow-xl group">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCn4lmHla9wdbdlbjTzJB2OuAJPln2tE6M2b_kzdqemZHw9K0Kl8_k-v5fLqWBk5P5ltu0wo9Yrm2czk0OugHE9zC973c8eReaZ7rEqKPSFIZza6nzm-PhMZ3eEMPpjWunqCL-4Z1haAxhgMLXNCMOD06br0Kgz1La2debim0ZZBBJG2b7vRsAMWRf1Ou8xfVT1Pk1secCeetnAhhyOgBWZHg9qUegJdPfDYkT71JPQWo_i9sLaR-nw-ohf4kqPjq0-FsbjV3noChLN"
                className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale mix-blend-multiply group-hover:scale-110 transition-transform duration-1000"
                alt="Route Map"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent"></div>
              
              <div className="relative z-10 p-6 mt-auto">
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-outline-variant shadow-2xl">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Est. Transit Time</span>
                    <span className="font-mono text-primary font-bold text-lg">24 mins</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-on-surface-variant font-medium">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                      <span className="material-symbols-outlined text-[20px] text-primary">route</span>
                    </div>
                    <span>12.4 miles (AI Optimized Path)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Final Dispatch Action Card */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-lg flex flex-col gap-6 text-center">
              <div>
                <h4 className="text-base font-bold text-on-background mb-2">Final Verification</h4>
                <p className="text-[13px] text-on-surface-variant leading-relaxed">
                  All mission parameters are verified. Transport vehicle is pre-loaded and standing by at the donor facility.
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                <button className="w-full bg-primary text-white py-4 rounded-xl font-bold text-base hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3">
                  <span className="material-symbols-outlined text-[24px]">local_shipping</span>
                  Deploy Mission
                </button>
                <button className="w-full bg-white text-on-surface-variant border border-outline-variant py-3 rounded-xl font-bold text-sm hover:bg-surface-container transition-all">
                  Cancel & Review Alternatives
                </button>
              </div>
              
              <p className="text-[10px] text-on-surface-variant font-medium italic">
                Authorized by Agent BEACON-AI v2.4
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SupplyMatchmakerRouting;
