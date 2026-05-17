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
  CRITICAL_SHORTAGE: 'Shortage',
};

const STATUS_BADGE = {
  ADEQUATE: 'text-emerald-700',
  SURPLUS: 'text-sky-700',
  LOW: 'text-amber-700',
  CRITICAL_SHORTAGE: 'text-error',
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
    const orderedCategories = [
      ...CATEGORY_ORDER.filter((c) => byCat.has(c)),
      ...[...byCat.keys()].filter((c) => !CATEGORY_ORDER.includes(c)),
    ];

    return orderedCategories.map((c) => {
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
    <div className={`flex flex-col h-full overflow-hidden bg-white ${isEmbedded ? '' : 'h-screen'}`}>
      {/* Page Header */}
      <header className="flex-shrink-0 px-8 py-5 border-b border-outline-variant bg-white flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-on-surface tracking-tight">Regional Analytics</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Network supply metrics across active hospitals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={loading || !summary}
            className="flex items-center gap-2 px-4 py-2 bg-white text-on-surface border border-outline-variant rounded-lg hover:bg-surface-container transition-all text-sm font-bold disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-all text-sm font-bold disabled:opacity-60"
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
      <main className="flex-1 overflow-y-auto bg-white">
        <div className="w-full min-h-full flex flex-col">
          {/* KPI Bento Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 border-b border-outline-variant">
            <div className="bg-white border-r border-outline-variant p-5 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Avg Network Health</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${scoreColor(readinessPct)}`}>
                  {loading && !summary ? '—' : `${readinessPct}%`}
                </span>
                <span className="text-xs font-semibold text-on-surface-variant">
                  {summary ? `${summary.inventoryEntryCount} entries` : ''}
                </span>
              </div>
            </div>

            <div className="bg-white border-r border-outline-variant p-5 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">At-Risk Nodes</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-on-surface">
                  {loading && !summary
                    ? '—'
                    : String(summary?.hospitalsWithCritical ?? 0).padStart(2, '0')}
                </span>
                <span className="text-xs font-semibold text-error">
                  {summary?.criticalShortages ?? 0} Critical Items
                </span>
              </div>
            </div>

            <div className="bg-white border-r border-outline-variant p-5 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Active Transfers</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-on-surface">
                  {loading ? '—' : String(activeTransferCount).padStart(2, '0')}
                </span>
                <span className="text-xs font-semibold text-secondary">
                  In Transit
                </span>
              </div>
            </div>

            <div className="bg-white p-5 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">System Integrity</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${systemIntegrityColor}`}>
                  {loading && !summary ? '—' : systemIntegrityLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Leaderboard and Trends Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 flex-1 min-h-0">
            {/* Hospital Readiness Leaderboard */}
            <div className="lg:col-span-8 bg-white border-r border-outline-variant flex flex-col overflow-hidden min-h-full">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-outline-variant">
                      <th className="px-8 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Facility</th>
                      <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Area</th>
                      <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Score</th>
                      <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {loading && leaderboard.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-10 text-center text-sm text-on-surface-variant">
                          Loading facilities…
                        </td>
                      </tr>
                    )}
                    {!loading && leaderboard.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-10 text-center text-sm text-on-surface-variant">
                          No hospitals found in the network.
                        </td>
                      </tr>
                    )}
                    {leaderboard.map((row) => {
                      const isCritical = row.status === 'CRITICAL_SHORTAGE';
                      return (
                        <tr
                          key={row.id}
                          className="bg-white hover:bg-surface-bright transition-colors"
                        >
                          <td className="px-8 py-5 flex items-center gap-4">
                            <div
                              className={`w-10 h-10 text-white flex items-center justify-center font-bold text-sm ${
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
                          <td className={`px-6 py-5 font-mono text-sm font-semibold ${scoreColor(row.score)}`}>
                            {row.score}%
                          </td>
                          <td className="px-6 py-5">
                            <span
                              className={`inline-block w-20 text-sm font-semibold ${
                                STATUS_BADGE[row.status] ??
                                'text-zinc-700'
                              }`}
                            >
                              {STATUS_LABEL[row.status] ?? row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Category Analytics */}
            <div className="lg:col-span-4 flex flex-col min-h-full">
              <div className="bg-white flex flex-col overflow-hidden flex-1 min-h-0">
                <div className="bg-white px-8 py-4 border-b border-outline-variant flex items-center">
                  <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">By Category</h3>
                </div>
                <div className="flex-1 p-6 bg-white overflow-hidden">
                  {categoryHealth.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-xs text-on-surface-variant">
                      {loading ? 'Loading…' : 'No category data.'}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col justify-end">
                      <div
                        className="flex-1 grid items-end gap-3"
                        style={{
                          gridTemplateColumns: `repeat(${categoryHealth.length}, minmax(0, 1fr))`,
                        }}
                      >
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
                              className="flex flex-col items-center justify-end h-full"
                              title={`${c.label}: ${c.healthy}/${c.total} healthy`}
                            >
                              <span className="text-xs font-bold text-on-surface mb-1">
                                {c.pct}%
                              </span>
                              <div
                                className={`w-full ${barColor} transition-all`}
                                style={{ height: `${Math.max(c.pct, 4)}%` }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div
                        className="grid items-end w-full border-t border-outline-variant pt-3"
                        style={{
                          gridTemplateColumns: `repeat(${categoryHealth.length}, minmax(0, 1fr))`,
                        }}
                      >
                        {categoryHealth.map((c) => (
                          <span
                            key={c.category}
                            className="text-xs font-bold text-on-surface-variant text-center"
                          >
                            {c.label}
                          </span>
                        ))}
                      </div>
                    </div>
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
