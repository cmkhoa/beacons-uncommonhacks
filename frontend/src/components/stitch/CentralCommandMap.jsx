import React, { useEffect, useMemo, useState } from 'react';
import MapViewer from '../MapViewer';
import { distanceMiles } from '../../data/hospitalData';
import { apiGet } from '../../lib/api';

const ROUTE_COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fb923c', '#f472b6'];

// Derive an overall hospital status from its inventory entries
const deriveHospitalStatus = (entries) => {
  if (!entries || entries.length === 0) return 'ADEQUATE';
  if (entries.some((e) => e.status === 'CRITICAL_SHORTAGE')) return 'CRITICAL_SHORTAGE';
  if (entries.some((e) => e.status === 'LOW')) return 'LOW';
  if (entries.some((e) => e.status === 'SURPLUS')) return 'DONOR';
  return 'ADEQUATE';
};

const getShortEntries = (hospital) =>
  (hospital.inventory ?? []).filter(
    (e) => e.status === 'CRITICAL_SHORTAGE' || e.status === 'LOW'
  );

const estimateETA = (distanceMi) => Math.round((distanceMi / 25) * 60);

const findDonorForItem = (hospital, itemId, donors) => {
  if (!hospital?.location) return null;
  const withInventoryMatch = donors
    .filter((d) => d.id !== hospital.id && d.location)
    .filter((d) =>
      (d.inventory ?? []).some(
        (e) => e.itemId === itemId && (e.status === 'SURPLUS' || e.status === 'ADEQUATE')
      )
    )
    .map((d) => ({ d, dist: distanceMiles(hospital.location, d.location) }))
    .sort((a, b) => a.dist - b.dist);
  if (withInventoryMatch.length > 0) return withInventoryMatch[0].d;

  const anyDonor = donors
    .filter((d) => d.id !== hospital.id && d.location)
    .map((d) => ({ d, dist: distanceMiles(hospital.location, d.location) }))
    .sort((a, b) => a.dist - b.dist);
  return anyDonor[0]?.d ?? null;
};

const CentralCommandMap = ({ isEmbedded = false }) => {
  const [hospitals, setHospitals] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [expanded, setExpanded] = useState(null);
  const [activeTransfers, setActiveTransfers] = useState([]);
  const [etaByTransferId, setEtaByTransferId] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [hData, iData] = await Promise.all([
          apiGet('/api/hospitals?hydrate=true'),
          apiGet('/api/items'),
        ]);
        if (cancelled) return;
        setHospitals(hData.hospitals ?? []);
        setItems(iData.items ?? []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const hospitalsWithStatus = useMemo(
    () =>
      hospitals.map((h) => ({
        ...h,
        status: deriveHospitalStatus(h.inventory),
      })),
    [hospitals]
  );

  const donors = useMemo(
    () => hospitalsWithStatus.filter((h) => h.status === 'DONOR'),
    [hospitalsWithStatus]
  );
  const criticalHospitals = useMemo(
    () => hospitalsWithStatus.filter((h) => h.status === 'CRITICAL_SHORTAGE'),
    [hospitalsWithStatus]
  );
  const lowHospitals = useMemo(
    () => hospitalsWithStatus.filter((h) => h.status === 'LOW'),
    [hospitalsWithStatus]
  );

  const readinessPct = useMemo(() => {
    const allEntries = hospitalsWithStatus.flatMap((h) => h.inventory ?? []);
    if (allEntries.length === 0) return 0;
    const healthy = allEntries.filter(
      (e) => e.status === 'ADEQUATE' || e.status === 'SURPLUS'
    ).length;
    return Math.round((healthy / allEntries.length) * 100);
  }, [hospitalsWithStatus]);

  const criticalShortItemNames = useMemo(() => {
    const names = new Set();
    for (const h of criticalHospitals) {
      for (const e of getShortEntries(h)) {
        names.add(itemMap.get(e.itemId)?.name ?? e.itemId);
      }
    }
    return [...names];
  }, [criticalHospitals, itemMap]);

  const getShortItemNames = (hospital) =>
    getShortEntries(hospital).map(
      (e) => itemMap.get(e.itemId)?.name ?? e.itemId
    );

  const buildSuggestion = (hospital) => {
    const shortEntries = getShortEntries(hospital);
    const firstShort = shortEntries[0];
    if (!firstShort) return null;
    const donor = findDonorForItem(hospital, firstShort.itemId, donors);
    if (!donor || !hospital.location || !donor.location) return null;
    const itemName = itemMap.get(firstShort.itemId)?.name ?? firstShort.itemId;
    const distance = distanceMiles(hospital.location, donor.location);
    const needed = Math.max(
      1,
      Math.ceil(
        (firstShort.threshold ?? 1) - (firstShort.availableCount ?? 0)
      ) || 1
    );
    return {
      id: `request_${hospital.id}_${firstShort.id}`,
      itemId: firstShort.itemId,
      itemName,
      quantity: needed,
      fromHospitalId: donor.id,
      fromHospitalName: donor.name,
      toHospitalId: hospital.id,
      toHospitalName: hospital.name,
      status: 'PENDING',
      distance: Math.round(distance * 10) / 10,
    };
  };

  const toggle = (card) => setExpanded((prev) => (prev === card ? null : card));

  const addTransfer = (suggestion) => {
    if (!suggestion) return;
    setActiveTransfers((prev) =>
      prev.find((t) => t.id === suggestion.id) ? prev : [...prev, suggestion]
    );
  };

  const removeTransfer = (id) => {
    setActiveTransfers((prev) => prev.filter((t) => t.id !== id));
    setEtaByTransferId((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleTransferRouted = (id, etaMins) => {
    setEtaByTransferId((prev) => ({ ...prev, [id]: etaMins }));
  };

  return (
    <div className={`flex flex-col lg:flex-row h-full overflow-hidden relative ${isEmbedded ? '' : 'h-screen'}`}>
      {/* Map Canvas */}
      <div className="flex-1 relative bg-surface-container-low h-full flex flex-col min-h-0">
        <div className="absolute top-4 left-4 z-10 flex gap-3 flex-wrap pointer-events-none">
          {/* Regional Readiness card */}
          <div
            onClick={() => toggle('readiness')}
            className="bg-surface/90 backdrop-blur-md border border-outline-variant rounded-xl shadow-lg pointer-events-auto cursor-pointer select-none transition-all duration-300 overflow-hidden"
            style={{ width: expanded === 'readiness' ? '220px' : '110px' }}
          >
            {expanded === 'readiness' ? (
              <div className="p-5">
                <div className="flex items-center gap-2 text-on-surface-variant mb-1">
                  <span className="material-symbols-outlined text-[20px] text-primary">health_and_safety</span>
                  <span className="text-[11px] uppercase font-bold tracking-widest">Regional Readiness</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-on-surface">{readinessPct}%</span>
                </div>
                <div className="w-full bg-surface-variant h-1.5 rounded-full mt-4 overflow-hidden">
                  <div className="bg-primary-container h-full rounded-full transition-all duration-1000" style={{ width: `${readinessPct}%` }}></div>
                </div>
              </div>
            ) : (
              <div className="p-3 flex flex-col items-center">
                <span className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant mb-1">Readiness</span>
                <span className="text-2xl font-bold text-on-surface">{readinessPct}%</span>
                <div className="w-full bg-surface-variant h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-primary-container h-full rounded-full" style={{ width: `${readinessPct}%` }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Active Shortages card */}
          <div
            onClick={() => toggle('shortages')}
            className="bg-surface/90 backdrop-blur-md border border-outline-variant rounded-xl shadow-lg pointer-events-auto cursor-pointer select-none transition-all duration-300 overflow-hidden"
            style={{ width: expanded === 'shortages' ? '220px' : '110px' }}
          >
            {expanded === 'shortages' ? (
              <div className="p-5">
                <div className="flex items-center gap-2 text-on-surface-variant mb-1">
                  <span className="material-symbols-outlined text-[20px] text-error">bloodtype</span>
                  <span className="text-[11px] uppercase font-bold tracking-widest">Active Shortages</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-error">{criticalHospitals.length}</span>
                  <span className="text-xs text-on-surface-variant mb-2 font-medium">
                    Critical {criticalHospitals.length === 1 ? 'Facility' : 'Facilities'}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {criticalShortItemNames.map((item) => (
                    <span key={item} className="bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter">{item}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 flex flex-col items-center">
                <span className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant mb-1">Shortages</span>
                <span className="text-2xl font-bold text-error">{criticalHospitals.length}</span>
                <span className="text-[9px] text-on-surface-variant mt-1">
                  Critical {criticalHospitals.length === 1 ? 'Facility' : 'Facilities'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="w-full h-full relative overflow-hidden">
          <MapViewer
            hospitals={hospitalsWithStatus}
            itemMap={itemMap}
            activeTransfers={activeTransfers}
            onTransferRouted={handleTransferRouted}
          />
        </div>
      </div>

      {/* Right Sidebar: Mission Log */}
      <aside className="w-full lg:w-[380px] bg-surface border-l border-outline-variant h-full flex flex-col shrink-0 z-30 shadow-[-10px_0_25px_-10px_rgba(0,0,0,0.08)]">
        <div className="p-6 border-b border-outline-variant bg-surface-container-lowest flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-on-surface">Mission Log</h3>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-0.5">Real-time Intelligence</p>
          </div>
          <span className="bg-error-container text-on-error-container text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-error/10">
            <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
            Live
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-surface-bright/50 custom-scrollbar">
          {loading && (
            <div className="text-sm text-on-surface-variant">Loading network…</div>
          )}
          {error && !loading && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              Failed to load: {error}
            </div>
          )}

          {/* Active transfers */}
          {activeTransfers.map((transfer, i) => {
            const eta = etaByTransferId[transfer.id] ?? estimateETA(transfer.distance);
            const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
            return (
              <div key={transfer.id} className="bg-surface rounded-xl p-4 shadow-sm relative overflow-hidden" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: `${color}55` }}>
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: color }}></div>
                <div className="flex justify-between items-start mb-2 pl-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-tight" style={{ color, background: `${color}15`, borderColor: `${color}40` }}>
                    Transfer En Route
                  </span>
                  <span className="font-mono text-[11px] text-on-surface-variant font-medium">Now</span>
                </div>
                <h4 className="font-bold text-sm text-on-surface pl-2 mb-1">{transfer.itemName} Transfer</h4>
                <p className="text-[13px] text-on-surface-variant pl-2">
                  <strong>{transfer.fromHospitalName}</strong> → <strong>{transfer.toHospitalName}</strong>
                </p>
                <p className="pl-2 mt-2" style={{ fontSize: '16px', fontWeight: 'bold', color: '#38bdf8' }}>
                  {transfer.quantity} {transfer.itemName} · {transfer.distance} mi · {eta} min
                </p>
                <div className="pl-2 mt-3">
                  <button
                    onClick={() => removeTransfer(transfer.id)}
                    className="bg-white text-on-surface-variant border border-outline-variant text-[11px] font-bold px-3 py-2 rounded-lg hover:bg-surface-container transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}

          {/* Critical shortage suggestions */}
          {criticalHospitals.map((hospital) => {
            const suggestion = buildSuggestion(hospital);
            if (!suggestion) return null;
            const alreadyActive = activeTransfers.some((t) => t.id === suggestion.id);
            const shortItems = getShortItemNames(hospital);
            return (
              <div key={hospital.id} className="bg-surface border border-error-container rounded-xl p-4 shadow-sm hover:shadow-md hover:border-error transition-all relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-error group-hover:w-1.5 transition-all"></div>
                <div className="flex justify-between items-start mb-3 pl-2">
                  <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded border border-red-200 uppercase tracking-tight">Critical Shortage</span>
                </div>
                <h4 className="font-bold text-sm text-on-surface pl-2 mb-1">{hospital.name}</h4>
                <p className="text-[13px] leading-relaxed text-on-surface-variant pl-2 mb-1">Short on: {shortItems.join(', ')}.</p>
                <p className="text-[12px] text-primary font-semibold pl-2">
                  Beacon matched <strong>{suggestion.fromHospitalName}</strong> · {suggestion.distance} mi
                </p>
                <p className="pl-2 mb-3" style={{ fontSize: '15px', fontWeight: 'bold', color: '#38bdf8' }}>
                  ETA: ~{estimateETA(suggestion.distance)} min
                </p>
                {!alreadyActive ? (
                  <div className="pl-2 flex gap-2">
                    <button onClick={() => addTransfer(suggestion)} className="bg-primary text-white text-[11px] font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-sm">
                      Execute Match
                    </button>
                    <button className="bg-white text-on-surface-variant border border-outline-variant text-[11px] font-bold px-3 py-2 rounded-lg hover:bg-surface-container transition-colors">Ignore</button>
                  </div>
                ) : (
                  <p className="pl-2 text-[11px] font-bold text-emerald-600">✓ Transfer dispatched</p>
                )}
              </div>
            );
          })}

          {/* LOW hospital suggestions */}
          {lowHospitals.map((hospital) => {
            const suggestion = buildSuggestion(hospital);
            if (!suggestion) return null;
            const alreadyActive = activeTransfers.some((t) => t.id === suggestion.id);
            const shortItems = getShortItemNames(hospital);
            return (
              <div key={hospital.id} className="bg-surface border border-outline-variant rounded-xl p-4 shadow-sm hover:shadow-md hover:border-amber-500 transition-all relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 group-hover:w-1.5 transition-all"></div>
                <div className="flex justify-between items-start mb-3 pl-2">
                  <span className="bg-yellow-50 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-200 uppercase tracking-tight">Elevated Demand</span>
                </div>
                <h4 className="font-bold text-sm text-on-surface pl-2 mb-1">{hospital.name}</h4>
                <p className="text-[13px] leading-relaxed text-on-surface-variant pl-2 mb-1">Running low on: {shortItems.join(', ')}.</p>
                <p className="text-[12px] text-amber-600 font-semibold pl-2">
                  Suggested donor: <strong>{suggestion.fromHospitalName}</strong> · {suggestion.distance} mi
                </p>
                <p className="pl-2 mb-3" style={{ fontSize: '15px', fontWeight: 'bold', color: '#38bdf8' }}>
                  ETA: ~{estimateETA(suggestion.distance)} min
                </p>
                {!alreadyActive ? (
                  <div className="pl-2">
                    <button onClick={() => addTransfer(suggestion)} className="bg-amber-500 text-white text-[11px] font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-sm">
                      Pre-emptive Match
                    </button>
                  </div>
                ) : (
                  <p className="pl-2 text-[11px] font-bold text-emerald-600">✓ Transfer dispatched</p>
                )}
              </div>
            );
          })}

          {!loading && !error && criticalHospitals.length === 0 && lowHospitals.length === 0 && activeTransfers.length === 0 && (
            <div className="text-sm text-on-surface-variant bg-surface border border-outline-variant rounded-xl p-4">
              All hospitals are within healthy thresholds. No actions required.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default CentralCommandMap;
