import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPatch } from '../../lib/api';

const STATUS_UI = {
  CRITICAL_SHORTAGE: {
    label: 'Shortage',
    badge:
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error text-white text-[11px] font-bold shadow-sm border border-error/20',
    icon: 'warning',
    row: 'bg-red-50/30 hover:bg-red-50/50',
    input:
      'w-16 h-9 border border-error rounded-lg px-1 text-center font-mono text-sm text-error focus:ring-4 focus:ring-error/10 outline-none bg-white font-bold',
    stock: 'text-error font-bold',
    iconBox: 'bg-red-100 border-red-200 animate-pulse',
    iconColor: 'text-red-600 fill-1',
  },
  LOW: {
    label: 'Low',
    badge:
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-100',
    icon: 'trending_down',
    row: 'bg-amber-50/20 hover:bg-amber-50/40',
    input:
      'w-16 h-9 border border-amber-300 rounded-lg px-1 text-center font-mono text-sm text-amber-800 focus:ring-2 focus:ring-amber-200 outline-none bg-white',
    stock: 'text-amber-800',
    iconBox: 'bg-amber-50 border-amber-100',
    iconColor: 'text-amber-600',
  },
  ADEQUATE: {
    label: 'Optimal',
    badge:
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-100',
    icon: null,
    row: 'hover:bg-surface-bright',
    input:
      'w-16 h-9 border border-outline-variant rounded-lg px-1 text-center font-mono text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
    stock: 'text-on-surface',
    iconBox: 'bg-indigo-50 border-indigo-100 group-hover:scale-110 transition-transform',
    iconColor: 'text-indigo-600',
  },
  SURPLUS: {
    label: 'Surplus',
    badge:
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container text-white text-[11px] font-bold shadow-sm',
    icon: 'arrow_upward',
    row: 'hover:bg-surface-bright',
    input:
      'w-16 h-9 border border-outline-variant rounded-lg px-1 text-center font-mono text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
    stock: 'text-on-surface',
    iconBox: 'bg-blue-50 border-blue-100',
    iconColor: 'text-blue-600',
  },
};

const CATEGORY_ICONS = {
  PPE: 'masks',
  LIFE_SUPPORT: 'air',
  BLOOD: 'bloodtype',
  MEDICATION: 'medication',
  GENERAL_SUPPLIES: 'inventory_2',
};

const CATEGORY_LABELS = {
  PPE: 'PPE',
  LIFE_SUPPORT: 'Life Support',
  BLOOD: 'Blood',
  MEDICATION: 'Medication',
  GENERAL_SUPPLIES: 'General Supplies',
};

const HospitalInventoryDashboard = ({ session, isEmbedded = false }) => {
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [scopedHospitalName, setScopedHospitalName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const hospitalId = session?.hospitalId ?? null;
  const isSingleHospital = Boolean(hospitalId);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const iJson = await apiGet('/api/items');
      const itemMap = new Map((iJson.items ?? []).map((i) => [i.id, i]));

      let hospitals = [];
      if (hospitalId) {
        const hJson = await apiGet(`/api/hospitals/${hospitalId}`);
        if (hJson.hospital) hospitals = [hJson.hospital];
        setScopedHospitalName(hJson.hospital.name ?? null);
      } else {
        const hJson = await apiGet('/api/hospitals?hydrate=true');
        hospitals = hJson.hospitals ?? [];
        setScopedHospitalName(null);
      }

      const flat = hospitals.flatMap((h) =>
        (h.inventory ?? []).map((entry) => {
          const item = itemMap.get(entry.itemId);
          const category = item?.category ?? 'GENERAL_SUPPLIES';
          return {
            id: entry.id,
            hospitalId: entry.hospitalId ?? h.id,
            hospitalName: h.name,
            itemName: item?.name ?? entry.itemId,
            category,
            categoryLabel: CATEGORY_LABELS[category] ?? category,
            count: entry.count ?? 0,
            status: entry.status ?? 'ADEQUATE',
          };
        })
      );
      setRows(flat);
      const initial = {};
      flat.forEach((r) => {
        initial[r.id] = r.count;
      });
      setDrafts(initial);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const dirtyIds = useMemo(
    () =>
      rows
        .filter((r) => drafts[r.id] !== undefined && drafts[r.id] !== r.count)
        .map((r) => r.id),
    [rows, drafts]
  );

  const adjust = (entryId, delta) => {
    setDrafts((prev) => {
      const current = prev[entryId] ?? 0;
      return { ...prev, [entryId]: Math.max(0, current + delta) };
    });
  };

  const setDraftValue = (entryId, raw) => {
    const n = parseInt(raw, 10);
    setDrafts((prev) => ({
      ...prev,
      [entryId]: Number.isFinite(n) && n >= 0 ? n : 0,
    }));
  };

  const discard = () => {
    const reset = {};
    rows.forEach((r) => {
      reset[r.id] = r.count;
    });
    setDrafts(reset);
    setFeedback(null);
  };

  const commit = async () => {
    if (dirtyIds.length === 0) {
      setFeedback({ kind: 'info', text: 'No changes to commit.' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      await Promise.all(
        dirtyIds.map(async (entryId) => {
          const row = rows.find((r) => r.id === entryId);
          if (!row) return;
          const newCount = drafts[entryId];
          await apiPatch(
            `/api/hospitals/${row.hospitalId}/inventory/${entryId}`,
            {
              count: newCount,
              source: 'MANUAL_FORM',
              message: `Manual correction: ${row.count} → ${newCount}`,
            }
          );
        })
      );
      setFeedback({
        kind: 'success',
        text: `Committed ${dirtyIds.length} correction(s) to the network.`,
      });
      await loadInventory();
    } catch (err) {
      setFeedback({ kind: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`flex flex-col h-full overflow-hidden bg-surface-bright ${
        isEmbedded ? '' : 'h-screen'
      }`}
    >
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-on-surface">Hospital Inventory</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              {isSingleHospital && scopedHospitalName
                ? `Showing supplies at ${scopedHospitalName} only.`
                : 'Regional view — all hospitals. Nurses only edit their own hospital.'}
            </p>
          </div>

          {feedback && (
            <div
              className={`mb-4 px-4 py-3 rounded-lg text-sm border ${
                feedback.kind === 'error'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : feedback.kind === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-sky-50 text-sky-700 border-sky-200'
              }`}
            >
              {feedback.text}
            </div>
          )}

          <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-surface-container-low px-8 py-4 border-b border-outline-variant grid grid-cols-12 gap-4 items-center">
              <div className="col-span-5 md:col-span-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
                Item Designation
              </div>
              <div className="col-span-3 md:col-span-2 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest text-right">
                Current Stock
              </div>
              <div className="col-span-4 md:col-span-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest text-center">
                System Status
              </div>
              <div className="hidden md:block md:col-span-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest text-right">
                Manual Correction
              </div>
            </div>

            <div className="divide-y divide-surface-container">
              {loading && (
                <div className="px-8 py-12 text-center text-sm text-on-surface-variant">
                  Loading inventory…
                </div>
              )}
              {error && !loading && (
                <div className="px-8 py-12 text-center text-sm text-error">
                  Failed to load: {error}
                </div>
              )}
              {!loading && !error && rows.length === 0 && (
                <div className="px-8 py-12 text-center text-sm text-on-surface-variant">
                  No inventory entries found.
                </div>
              )}
              {!loading &&
                !error &&
                rows.map((row) => {
                  const ui = STATUS_UI[row.status] ?? STATUS_UI.ADEQUATE;
                  const icon = CATEGORY_ICONS[row.category] ?? 'inventory_2';
                  const draft = drafts[row.id] ?? row.count;
                  const isDirty = draft !== row.count;

                  return (
                    <div
                      key={row.id}
                      className={`px-8 py-5 transition-colors grid grid-cols-12 gap-4 items-center group ${ui.row}`}
                    >
                      <div className="col-span-5 md:col-span-4 flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 shadow-sm ${ui.iconBox}`}
                        >
                          <span
                            className={`material-symbols-outlined text-2xl ${ui.iconColor}`}
                          >
                            {icon}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">
                            {row.itemName}
                          </p>
                          <p className="text-[11px] text-on-surface-variant font-medium">
                            {isSingleHospital ? row.categoryLabel : row.hospitalName}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`col-span-3 md:col-span-2 text-right font-mono text-base font-semibold ${ui.stock}`}
                      >
                        {row.count.toLocaleString()}{' '}
                        <span className="text-on-surface-variant font-sans text-xs font-normal">
                          units
                        </span>
                      </div>

                      <div className="col-span-4 md:col-span-3 flex justify-center">
                        <span className={ui.badge}>
                          {ui.icon && (
                            <span className="material-symbols-outlined text-[14px]">
                              {ui.icon}
                            </span>
                          )}
                          {!ui.icon && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          )}
                          {ui.label}
                        </span>
                      </div>

                      <div className="hidden md:flex md:col-span-3 justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => adjust(row.id, -1)}
                          disabled={draft <= 0}
                          className="w-9 h-9 rounded-lg border border-outline-variant flex items-center justify-center hover:bg-surface-container hover:border-primary text-on-surface-variant transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            remove
                          </span>
                        </button>
                        <input
                          className={`${ui.input} ${isDirty ? 'ring-2 ring-primary/30' : ''}`}
                          type="number"
                          min="0"
                          value={draft}
                          onChange={(e) => setDraftValue(row.id, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => adjust(row.id, 1)}
                          className="w-9 h-9 rounded-lg border border-outline-variant flex items-center justify-center hover:bg-surface-container hover:border-primary text-on-surface-variant transition-all"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            add
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface-container-low/50 p-4 rounded-2xl border border-dashed border-outline-variant">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant">
                info
              </span>
              <p className="text-xs text-on-surface-variant font-medium italic">
                {dirtyIds.length > 0
                  ? `${dirtyIds.length} unsaved correction(s)`
                  : 'Adjust counts with +/− then commit'}
              </p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={discard}
                disabled={dirtyIds.length === 0 || submitting}
                className="flex-1 sm:flex-none px-8 py-3 rounded-xl border border-outline-variant bg-white text-on-surface-variant font-bold text-sm hover:bg-surface-container transition-all shadow-sm disabled:opacity-50"
              >
                Discard Changes
              </button>
              <button
                type="button"
                onClick={commit}
                disabled={dirtyIds.length === 0 || submitting}
                className="flex-1 sm:flex-none px-8 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:shadow-lg hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">sync</span>
                {submitting ? 'Committing…' : 'Commit to Network'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HospitalInventoryDashboard;
