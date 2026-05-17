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
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-surface-bright/50 custom-scrollbar">
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
              <div key={transfer.id} className="bg-surface rounded-lg p-2.5 shadow-sm relative overflow-hidden" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: `${color}55` }}>
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: color }}></div>
                <div className="flex justify-between items-center pl-2">
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded border uppercase tracking-tight" style={{ color, background: `${color}15`, borderColor: `${color}40` }}>
                    Transfer
                  </span>
                  <span className="font-mono text-xs text-on-surface-variant font-medium">Now</span>
                </div>
                <h4 className="font-bold text-sm leading-tight text-on-surface pl-2 mt-1">{transfer.itemName}</h4>
                <p className="text-sm leading-tight text-on-surface-variant pl-2">
                  <strong>{transfer.fromHospitalName}</strong> → <strong>{transfer.toHospitalName}</strong>
                </p>
                <p className="pl-2" style={{ fontSize: '12px', fontWeight: 'bold', color: '#38bdf8', lineHeight: 1.25 }}>
                  {transfer.quantity} items, {transfer.distance} mi, {eta} min
                </p>
                <div className="pl-2 mt-1">
                  <button
                    onClick={() => removeTransfer(transfer.id)}
                    className="bg-white text-on-surface-variant border border-outline-variant text-xs font-bold px-2.5 py-1 rounded-md hover:bg-surface-container transition-colors"
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
              <div key={hospital.id} className="bg-surface border border-error-container rounded-lg p-2.5 shadow-sm hover:shadow-md hover:border-error transition-all relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-error group-hover:w-1.5 transition-all"></div>
                <div className="flex justify-between items-center pl-2">
                  <span className="bg-red-50 text-red-700 text-xs font-bold px-1.5 py-0.5 rounded border border-red-200 uppercase tracking-tight">Shortage</span>
                </div>
                <h4 className="font-bold text-sm leading-tight text-on-surface pl-2 mt-1">{hospital.name}</h4>
                <p className="text-sm leading-tight text-on-surface-variant pl-2">Items: {shortItems.join(', ')}</p>
                <p className="text-xs leading-tight text-primary font-semibold pl-2">
                  Donor: <strong>{suggestion.fromHospitalName}</strong>, {suggestion.distance} mi
                </p>
                <p className="pl-2 mb-1" style={{ fontSize: '12px', fontWeight: 'bold', color: '#38bdf8', lineHeight: 1.25 }}>
                  ETA: ~{estimateETA(suggestion.distance)} min
                </p>
                {!alreadyActive ? (
                  <div className="pl-2 flex gap-2">
                    <button onClick={() => addTransfer(suggestion)} className="bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-md hover:opacity-90 transition-opacity shadow-sm">
                      Execute Match
                    </button>
                    <button className="bg-white text-on-surface-variant border border-outline-variant text-xs font-bold px-2.5 py-1 rounded-md hover:bg-surface-container transition-colors">Ignore</button>
                  </div>
                ) : (
                  <p className="pl-2 text-xs font-bold text-emerald-600">Transfer dispatched</p>
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
              <div key={hospital.id} className="bg-surface border border-outline-variant rounded-lg p-2.5 shadow-sm hover:shadow-md hover:border-amber-500 transition-all relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 group-hover:w-1.5 transition-all"></div>
                <div className="flex justify-between items-center pl-2">
                  <span className="bg-yellow-50 text-yellow-700 text-xs font-bold px-1.5 py-0.5 rounded border border-yellow-200 uppercase tracking-tight">Shortage</span>
                </div>
                <h4 className="font-bold text-sm leading-tight text-on-surface pl-2 mt-1">{hospital.name}</h4>
                <p className="text-sm leading-tight text-on-surface-variant pl-2">Items: {shortItems.join(', ')}</p>
                <p className="text-xs leading-tight text-amber-600 font-semibold pl-2">
                  Donor: <strong>{suggestion.fromHospitalName}</strong>, {suggestion.distance} mi
                </p>
                <p className="pl-2 mb-1" style={{ fontSize: '12px', fontWeight: 'bold', color: '#38bdf8', lineHeight: 1.25 }}>
                  ETA: ~{estimateETA(suggestion.distance)} min
                </p>
                {!alreadyActive ? (
                  <div className="pl-2">
                    <button onClick={() => addTransfer(suggestion)} className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-md hover:opacity-90 transition-opacity shadow-sm">
                      Match
                    </button>
                  </div>
                ) : (
                  <p className="pl-2 text-xs font-bold text-emerald-600">Transfer dispatched</p>
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
