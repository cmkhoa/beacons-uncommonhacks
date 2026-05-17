import React, { useEffect, useMemo, useState } from 'react';
import { apiGet } from '../../lib/api';

const CATEGORY_LABELS = {
  PPE: 'PPE',
  LIFE_SUPPORT: 'Life Support',
  BLOOD: 'Blood',
  MEDICATION: 'Meds',
  GENERAL_SUPPLIES: 'Supplies',
};
const CATEGORY_ORDER = ['PPE', 'LIFE_SUPPORT', 'BLOOD', 'MEDICATION', 'GENERAL_SUPPLIES'];

const STATUS_LABEL = {
  ADEQUATE: 'Optimal',
  SURPLUS: 'Surplus',
  LOW: 'Low',
  CRITICAL_SHORTAGE: 'Critical',
};

const STATUS_BADGE = {
  ADEQUATE: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  SURPLUS: 'bg-sky-50 text-sky-800 border-sky-100',
  LOW: 'bg-amber-50 text-amber-800 border-amber-100',
  CRITICAL_SHORTAGE: 'bg-red-100 text-red-800 border-red-200 animate-pulse',
};

const CHICAGO_CENTER = { latitude: 41.8781, longitude: -87.6298 };

const initialsFromName = (name) => {
  if (!name) return '??';
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = words.map((w) => w[0]?.toUpperCase() ?? '').join('');
  return initials || name.slice(0, 2).toUpperCase();
};

const sectorFromLocation = (loc) => {
  if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
    return '—';
  }
  const ns = loc.latitude >= CHICAGO_CENTER.latitude ? 'North' : 'South';
  const ew = loc.longitude >= CHICAGO_CENTER.longitude ? 'East' : 'West';
  return `${ns}-${ew}`;
};

const deriveHospitalStatus = (entries) => {
  if (!entries || entries.length === 0) return 'ADEQUATE';
  if (entries.some((e) => e.status === 'CRITICAL_SHORTAGE')) return 'CRITICAL_SHORTAGE';
  if (entries.some((e) => e.status === 'LOW')) return 'LOW';
  if (entries.some((e) => e.status === 'SURPLUS')) return 'SURPLUS';
  return 'ADEQUATE';
};

const healthScore = (entries) => {
  if (!entries || entries.length === 0) return 100;
  const healthy = entries.filter(
    (e) => e.status === 'ADEQUATE' || e.status === 'SURPLUS'
  ).length;
  return Math.round((healthy / entries.length) * 100);
};

const scoreColor = (score) => {
  if (score >= 80) return 'text-emerald-700';
  if (score >= 50) return 'text-amber-700';
  return 'text-error';
};

const RegionalReadinessOverview = ({ isEmbedded = false }) => {
  const [summary, setSummary] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [items, setItems] = useState([]);
  const [activeTransferCount, setActiveTransferCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryData, hospData, itemsData, reqData] = await Promise.all([
          apiGet('/api/analytics/summary'),
          apiGet('/api/hospitals?hydrate=true'),
          apiGet('/api/items'),
          apiGet('/api/requests'),
        ]);
        if (cancelled) return;
        setSummary(summaryData);
        setHospitals(hospData.hospitals ?? []);
        setItems(itemsData.items ?? []);
        setActiveTransferCount((reqData.requests ?? []).length);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const leaderboard = useMemo(() => {
    return hospitals
      .map((h) => {
        const entries = h.inventory ?? [];
        return {
          id: h.id,
          name: h.name,
          score: healthScore(entries),
          status: deriveHospitalStatus(entries),
          sector: sectorFromLocation(h.location),
          entryCount: entries.length,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [hospitals]);

  const readinessPct = useMemo(() => {
    const entries = summary?.entries ?? [];
    if (entries.length === 0) return 0;
    const healthy = entries.filter(
      (e) => e.status === 'ADEQUATE' || e.status === 'SURPLUS'
    ).length;
    return Math.round((healthy / entries.length) * 100);
  }, [summary]);

  const categoryHealth = useMemo(() => {
    const entries = summary?.entries ?? [];
    if (entries.length === 0) return [];
    const byCat = new Map();
    for (const e of entries) {
      const cat = itemMap.get(e.itemId)?.category ?? 'OTHER';
      if (!byCat.has(cat)) byCat.set(cat, { healthy: 0, total: 0 });
      const slot = byCat.get(cat);
      slot.total += 1;
      if (e.status === 'ADEQUATE' || e.status === 'SURPLUS') slot.healthy += 1;
    }
    return CATEGORY_ORDER.filter((c) => byCat.has(c)).map((c) => {
      const slot = byCat.get(c);
      return {
        category: c,
        label: CATEGORY_LABELS[c] ?? c,
        ...slot,
        pct: slot.total === 0 ? 0 : Math.round((slot.healthy / slot.total) * 100),
      };
    });
  }, [summary, itemMap]);

  const criticalHospitals = useMemo(
    () => leaderboard.filter((l) => l.status === 'CRITICAL_SHORTAGE'),
    [leaderboard]
  );

  const systemIntegrityLabel =
    readinessPct >= 80 ? 'Optimal' : readinessPct >= 50 ? 'Degraded' : 'Critical';
  const systemIntegrityColor =
    readinessPct >= 80
      ? 'text-emerald-700'
      : readinessPct >= 50
        ? 'text-amber-700'
        : 'text-error';

  const handleRefresh = () => setRefreshTick((t) => t + 1);

  const handleExport = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      readinessPct,
      atRiskHospitals: criticalHospitals.map((h) => ({
        id: h.id,
        name: h.name,
        score: h.score,
        sector: h.sector,
      })),
      activeTransferCount,
      leaderboard,
      categoryHealth,
      summary,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beacon-readiness-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
          <button
            type="button"
            onClick={handleExport}
            disabled={loading || !summary}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-on-surface border border-outline-variant rounded-xl hover:bg-surface-container transition-all text-sm font-bold shadow-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Analytics
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:shadow-lg hover:opacity-90 transition-all text-sm font-bold shadow-md disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
              {loading ? 'progress_activity' : 'refresh'}
            </span>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-6 md:mx-10 mt-4 px-4 py-3 rounded-lg text-sm border bg-red-50 text-red-700 border-red-200">
          Failed to load analytics: {error}
        </div>
      )}

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
                <span className={`text-4xl font-bold tracking-tighter ${scoreColor(readinessPct)}`}>
                  {loading && !summary ? '—' : `${readinessPct}%`}
                </span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tight">
                  {summary ? `${summary.inventoryEntryCount} entries` : ''}
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
                <span className="text-4xl font-bold text-on-surface tracking-tighter">
                  {loading && !summary
                    ? '—'
                    : String(summary?.hospitalsWithCritical ?? 0).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-bold text-error uppercase tracking-tight bg-red-50 px-2 py-0.5 rounded border border-red-100">
                  {summary?.criticalShortages ?? 0} Critical Items
                </span>
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
                <span className="text-4xl font-bold text-on-surface tracking-tighter">
                  {loading ? '—' : String(activeTransferCount).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-tight bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  In Transit
                </span>
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
                <span className={`text-3xl font-bold tracking-tighter uppercase ${systemIntegrityColor}`}>
                  {loading && !summary ? '—' : systemIntegrityLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Leaderboard and Trends Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Hospital Readiness Leaderboard */}
            <div className="lg:col-span-8 bg-white border border-outline-variant rounded-2xl flex flex-col overflow-hidden shadow-xl">
              <div className="bg-surface-container-low px-8 py-5 border-b border-outline-variant flex justify-between items-center">
                <h3 className="text-lg font-bold text-on-surface">Regional Leaderboard</h3>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  {leaderboard.length} {leaderboard.length === 1 ? 'facility' : 'facilities'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-bright/50 border-b border-outline-variant">
                      <th className="px-8 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Facility Name</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Sector</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Score</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Live Status</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Entries</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {loading && leaderboard.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-8 py-10 text-center text-sm text-on-surface-variant">
                          Loading facilities…
                        </td>
                      </tr>
                    )}
                    {!loading && leaderboard.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-8 py-10 text-center text-sm text-on-surface-variant">
                          No hospitals found in the network.
                        </td>
                      </tr>
                    )}
                    {leaderboard.map((row) => {
                      const isCritical = row.status === 'CRITICAL_SHORTAGE';
                      return (
                        <tr
                          key={row.id}
                          className={`group transition-colors ${
                            isCritical
                              ? 'bg-red-50/10 hover:bg-red-50/20'
                              : 'hover:bg-surface-bright'
                          }`}
                        >
                          <td className="px-8 py-5 flex items-center gap-4">
                            <div
                              className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-110 transition-transform ${
                                isCritical ? 'bg-error' : 'bg-primary-container'
                              }`}
                            >
                              {initialsFromName(row.name)}
                            </div>
                            <span className={`font-bold ${isCritical ? 'text-error' : 'text-on-surface'}`}>
                              {row.name}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-on-surface-variant font-medium text-sm">
                            {row.sector}
                          </td>
                          <td className={`px-6 py-5 font-mono text-base font-bold ${scoreColor(row.score)}`}>
                            {row.score}%
                          </td>
                          <td className="px-6 py-5">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                                STATUS_BADGE[row.status] ??
                                'bg-zinc-50 text-zinc-700 border-zinc-200'
                              }`}
                            >
                              {STATUS_LABEL[row.status] ?? row.status}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right text-sm text-on-surface-variant font-mono">
                            {row.entryCount}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Trends and Critical Sectors */}
            <div className="lg:col-span-4 flex flex-col gap-8">
              {/* Supply Trend Visualization */}
              <div className="bg-white border border-outline-variant rounded-2xl flex flex-col overflow-hidden h-72 shadow-xl">
                <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant flex justify-between items-center">
                  <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest">By Category</h3>
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">trending_up</span>
                </div>
                <div className="flex-1 p-6 flex flex-col justify-end relative bg-white overflow-hidden">
                  {categoryHealth.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-xs text-on-surface-variant">
                      {loading ? 'Loading…' : 'No category data.'}
                    </div>
                  ) : (
                    <>
                      <div className="absolute inset-0 flex items-end justify-between px-6 pb-10 pt-10 gap-3">
                        {categoryHealth.map((c) => {
                          const barColor =
                            c.pct >= 80
                              ? 'bg-primary'
                              : c.pct >= 50
                                ? 'bg-amber-400'
                                : 'bg-error';
                          return (
                            <div
                              key={c.category}
                              className="flex-1 flex flex-col items-center justify-end h-full"
                              title={`${c.label}: ${c.healthy}/${c.total} healthy`}
                            >
                              <span className="text-[10px] font-bold text-on-surface mb-1">
                                {c.pct}%
                              </span>
                              <div
                                className={`w-full rounded-t-lg ${barColor} transition-all`}
                                style={{ height: `${Math.max(c.pct, 4)}%` }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="relative z-10 flex justify-between items-end w-full border-t border-outline-variant pt-3">
                        {categoryHealth.map((c) => (
                          <span
                            key={c.category}
                            className="text-[10px] font-bold text-on-surface-variant flex-1 text-center"
                          >
                            {c.label}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Critical Sectors */}
              <div className="bg-white border border-outline-variant rounded-2xl flex flex-col overflow-hidden h-72 relative shadow-xl">
                <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
                  <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest">Critical Sectors</h3>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="text-on-surface-variant hover:text-on-surface transition-colors"
                    title="Refresh"
                  >
                    <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>
                      refresh
                    </span>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {criticalHospitals.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                      <span className="material-symbols-outlined text-[36px] text-emerald-500 mb-2">
                        verified
                      </span>
                      <p className="text-sm font-bold text-on-surface">
                        All sectors stable
                      </p>
                      <p className="text-[11px] text-on-surface-variant mt-1">
                        No critical shortages detected in the network.
                      </p>
                    </div>
                  ) : (
                    criticalHospitals.map((h) => (
                      <div
                        key={h.id}
                        className="border border-red-200 bg-red-50/40 rounded-xl px-3 py-2 flex items-center justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-error truncate">
                            {h.name}
                          </p>
                          <p className="text-[11px] text-on-surface-variant">
                            {h.sector} sector
                          </p>
                        </div>
                        <span className="font-mono text-sm font-bold text-error shrink-0 ml-3">
                          {h.score}%
                        </span>
                      </div>
                    ))
                  )}
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
