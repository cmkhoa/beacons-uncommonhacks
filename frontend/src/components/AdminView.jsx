import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase";
import { apiGet, apiPatch, apiPost } from "../lib/api";

function transferRequestPrimaryId(req) {
  return req.requestId ?? req.id;
}

const STATUS_STYLES = {
  CRITICAL_SHORTAGE: "bg-red-50 text-red-700 border-red-200",
  LOW: "bg-amber-50 text-amber-700 border-amber-200",
  ADEQUATE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SURPLUS: "bg-sky-50 text-sky-700 border-sky-200",
};

const TRANSFER_STATUS_STYLES = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-sky-50 text-sky-700 border-sky-200",
  IN_TRANSIT: "bg-indigo-50 text-indigo-700 border-indigo-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const SOURCE_STYLES = {
  VOICE_COMMAND: "bg-indigo-50 text-indigo-700",
  MANUAL_FORM: "bg-sky-50 text-sky-700",
  DEMO_BUTTON: "bg-fuchsia-50 text-fuchsia-700",
  SYSTEM: "bg-zinc-100 text-zinc-600",
};

function formatTimestamp(ts) {
  if (!ts) return "—";
  if (typeof ts.toDate === "function") return ts.toDate().toLocaleString();
  if (typeof ts === "object") {
    const seconds = ts._seconds ?? ts.seconds;
    if (typeof seconds === "number") {
      return new Date(seconds * 1000).toLocaleString();
    }
  }
  return new Date(ts).toLocaleString();
}

const ACTIVE_REQUEST_STATUSES = ["PENDING", "APPROVED", "IN_TRANSIT"];
const TRANSFER_POLL_MS = 5000;

const AdminTransferDonorRow = ({ row, onSelect, busy, highlight = false }) => (
  <li
    className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
      highlight
        ? "border-emerald-200 bg-emerald-50/40"
        : "border-outline-variant bg-white"
    }`}
  >
    <div className="min-w-0">
      <p className="text-sm font-bold text-on-surface truncate">{row.name}</p>
      {row.surplusEntry ? (
        <p className="text-[11px] text-emerald-700 font-medium">
          {row.exactMatch ? "Exact match" : "Category match"} ·{" "}
          <span className="font-mono">{row.entryItemName}</span> · Surplus:{" "}
          <span className="font-mono">{row.headroom}</span>
        </p>
      ) : (
        <p className="text-[11px] text-on-surface-variant">
          No surplus of this item
        </p>
      )}
    </div>
    <button
      type="button"
      onClick={onSelect}
      disabled={busy}
      className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 ${
        highlight
          ? "bg-emerald-600 text-white hover:opacity-90 shadow-sm"
          : "bg-white text-on-surface border border-outline-variant hover:bg-surface-container"
      }`}
    >
      {busy ? "…" : "Select"}
    </button>
  </li>
);

const AdminTransferDonorPickerModal = ({
  request,
  candidates,
  showAll,
  onToggleShowAll,
  onClose,
  onSelect,
  busy,
}) => {
  const { recommended, others } = candidates;
  const itemLine = `${request.itemName ?? ""} × ${request.quantity}`;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-2xl shadow-2xl border border-outline-variant w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-outline-variant flex justify-between items-start gap-4">
          <div>
            <h3 className="text-lg font-bold text-on-surface">
              Assign donor hospital
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Requester:{" "}
              <strong>
                {request.fromHospitalName ?? request.fromHospitalId}
              </strong>
              {" · "}
              Need: <strong>{itemLine}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-on-surface-variant hover:text-on-surface disabled:opacity-50"
            title="Close"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              Recommended ({recommended.length})
            </h4>
            {recommended.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic px-1">
                No hospitals currently report a surplus of this item.
              </p>
            ) : (
              <ul className="space-y-2">
                {recommended.map((row) => (
                  <AdminTransferDonorRow
                    key={row.id}
                    row={row}
                    onSelect={() => onSelect(row.id)}
                    busy={busy}
                    highlight
                  />
                ))}
              </ul>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={onToggleShowAll}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">
                {showAll ? "expand_less" : "expand_more"}
              </span>
              {showAll
                ? "Hide other hospitals"
                : `Show all hospitals (${others.length})`}
            </button>
            {showAll && (
              <ul className="space-y-2 mt-3">
                {others.length === 0 ? (
                  <li className="text-xs text-on-surface-variant italic px-1">
                    No other hospitals available.
                  </li>
                ) : (
                  others.map((row) => (
                    <AdminTransferDonorRow
                      key={row.id}
                      row={row}
                      onSelect={() => onSelect(row.id)}
                      busy={busy}
                    />
                  ))
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-outline-variant flex justify-end gap-2 bg-surface-container-lowest">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminView = () => {
  const [hospitals, setHospitals] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busyAction, setBusyAction] = useState(null);

  const [formEntryId, setFormEntryId] = useState("");
  const [formChange, setFormChange] = useState("-1");

  const [transferRequests, setTransferRequests] = useState([]);
  const [transferError, setTransferError] = useState(null);
  const [transfersLoading, setTransfersLoading] = useState(true);
  const [busyTransferId, setBusyTransferId] = useState(null);
  const [donorPickerRequest, setDonorPickerRequest] = useState(null);
  const [showAllInDonorPicker, setShowAllInDonorPicker] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const hospitalMap = useMemo(
    () => new Map(hospitals.map((h) => [h.id, h])),
    [hospitals]
  );
  const selectedHospital = hospitalMap.get(selectedHospitalId);
  const inventory = selectedHospital?.inventory ?? [];

  const donorCandidates = useMemo(() => {
    if (!donorPickerRequest) return { recommended: [], others: [] };
    const target = donorPickerRequest;
    const targetCategory =
      target.itemCategory ?? itemMap.get(target.itemId)?.category ?? null;

    const recommended = [];
    const others = [];

    for (const h of hospitals) {
      if (!h?.id || h.id === target.fromHospitalId) continue;

      const inv = h.inventory ?? [];
      let surplusEntry = inv.find(
        (e) => e.itemId === target.itemId && e.status === "SURPLUS"
      );
      if (!surplusEntry && targetCategory) {
        surplusEntry = inv.find((e) => {
          const cat = itemMap.get(e.itemId)?.category;
          return cat === targetCategory && e.status === "SURPLUS";
        });
      }

      const headroom = surplusEntry
        ? (surplusEntry.availableCount ?? 0) - (surplusEntry.threshold ?? 0)
        : 0;

      const entryItemName = surplusEntry
        ? itemMap.get(surplusEntry.itemId)?.name ?? surplusEntry.itemId
        : null;

      const row = {
        id: h.id,
        name: h.name,
        headroom,
        surplusEntry,
        entryItemName,
        exactMatch: !!surplusEntry && surplusEntry.itemId === target.itemId,
      };

      if (surplusEntry && headroom > 0) {
        recommended.push(row);
      } else {
        others.push(row);
      }
    }

    recommended.sort((a, b) => {
      if (a.exactMatch !== b.exactMatch) return a.exactMatch ? -1 : 1;
      return b.headroom - a.headroom;
    });
    others.sort((a, b) => a.name.localeCompare(b.name));

    return { recommended, others };
  }, [donorPickerRequest, hospitals, itemMap]);

  const refreshHospitals = async () => {
    setLoadingData(true);
    try {
      const [hData, iData] = await Promise.all([
        apiGet("/api/hospitals?hydrate=true"),
        apiGet("/api/items"),
      ]);
      const list = hData.hospitals ?? [];
      setHospitals(list);
      setItems(iData.items ?? []);
      if (!selectedHospitalId && list.length > 0) {
        setSelectedHospitalId(list[0].id);
      }
    } catch (err) {
      setActionError(`Failed to load admin data: ${err.message}`);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    refreshHospitals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTransferRequests = async ({ silent } = { silent: false }) => {
    if (!silent) setTransfersLoading(true);
    try {
      const data = await apiGet("/api/requests");
      const active = (data.requests ?? []).filter((r) =>
        ACTIVE_REQUEST_STATUSES.includes(r.status)
      );
      active.sort((a, b) => {
        const aSec = a.createdAt?._seconds ?? a.createdAt?.seconds ?? 0;
        const bSec = b.createdAt?._seconds ?? b.createdAt?.seconds ?? 0;
        return bSec - aSec;
      });
      setTransferRequests(active.slice(0, 25));
      setTransferError(null);
    } catch (err) {
      console.warn("[AdminView] failed to fetch transfer requests", err);
      setTransferError(err.message);
    } finally {
      if (!silent) setTransfersLoading(false);
    }
  };

  useEffect(() => {
    fetchTransferRequests();
    const intervalId = setInterval(
      () => fetchTransferRequests({ silent: true }),
      TRANSFER_POLL_MS
    );
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "inventory_logs"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setActivityLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.warn("[AdminView] inventory_logs listener error", err);
      }
    );
    return () => unsub();
  }, []);

  const itemLabel = (itemId) => {
    const it = itemMap.get(itemId);
    return it?.name ?? itemId;
  };

  const flash = (msg, isError = false) => {
    if (isError) {
      setActionError(msg);
      setActionMessage(null);
    } else {
      setActionMessage(msg);
      setActionError(null);
    }
    setTimeout(() => {
      setActionMessage(null);
      setActionError(null);
    }, 4500);
  };

  const mutateTransferRequest = async (req, path, successLabel, body = {}) => {
    const primaryId = transferRequestPrimaryId(req);
    if (!primaryId) {
      flash("Missing request id.", true);
      return false;
    }
    setBusyTransferId(primaryId);
    try {
      await apiPost(path, body);
      const name = req.itemName ?? (req.itemId ? itemLabel(req.itemId) : "item");
      flash(`${successLabel}: ${name} × ${req.quantity}.`);
      await fetchTransferRequests({ silent: true });
      return true;
    } catch (err) {
      flash(err.message, true);
      return false;
    } finally {
      setBusyTransferId(null);
    }
  };

  const openDonorPicker = (req) => {
    setDonorPickerRequest(req);
    setShowAllInDonorPicker(false);
  };

  const closeDonorPicker = () => {
    const pickerId = donorPickerRequest
      ? transferRequestPrimaryId(donorPickerRequest)
      : null;
    if (pickerId && busyTransferId === pickerId) return;
    setDonorPickerRequest(null);
    setShowAllInDonorPicker(false);
  };

  const assignDonorHospital = async (req, toHospitalId) => {
    const primaryId = transferRequestPrimaryId(req);
    const ok = await mutateTransferRequest(
      req,
      `/api/requests/${primaryId}/assign-donor`,
      "Donor assigned",
      { toHospitalId }
    );
    if (ok) {
      setDonorPickerRequest(null);
      setShowAllInDonorPicker(false);
    }
    return ok;
  };

  const approveTransferRequest = (req) =>
    mutateTransferRequest(
      req,
      `/api/requests/${transferRequestPrimaryId(req)}/approve`,
      "Approved"
    );

  const completeTransferRequest = (req) =>
    mutateTransferRequest(
      req,
      `/api/requests/${transferRequestPrimaryId(req)}/complete`,
      "Completed"
    );

  const renderTransferAdminActions = (req) => {
    const id = transferRequestPrimaryId(req);
    const isBusy = busyTransferId === id;
    const baseBtn =
      "inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed";

    if (!req.toHospitalId) {
      return (
        <button
          type="button"
          onClick={() => openDonorPicker(req)}
          disabled={isBusy}
          className={`${baseBtn} bg-white text-on-surface border border-outline-variant hover:bg-surface-container`}
        >
          <span className="material-symbols-outlined text-[14px]">hub</span>
          {isBusy ? "Working…" : "Assign donor"}
        </button>
      );
    }
    if (req.status === "PENDING") {
      return (
        <button
          type="button"
          onClick={() => approveTransferRequest(req)}
          disabled={isBusy}
          className={`${baseBtn} bg-primary text-white hover:opacity-90 shadow-sm`}
        >
          <span className="material-symbols-outlined text-[14px]">
            check_circle
          </span>
          {isBusy ? "Working…" : "Approve"}
        </button>
      );
    }
    if (req.status === "APPROVED" || req.status === "IN_TRANSIT") {
      return (
        <button
          type="button"
          onClick={() => completeTransferRequest(req)}
          disabled={isBusy}
          className={`${baseBtn} bg-emerald-600 text-white hover:opacity-90 shadow-sm`}
        >
          <span className="material-symbols-outlined text-[14px]">
            task_alt
          </span>
          {isBusy ? "Working…" : "Complete"}
        </button>
      );
    }
    return null;
  };

  const patchEntry = (hospitalId, entryId, body) =>
    apiPatch(`/api/hospitals/${hospitalId}/inventory/${entryId}`, body);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHospitalId || !formEntryId) {
      flash("Pick a hospital and inventory item first.", true);
      return;
    }
    const delta = Number(formChange);
    if (!Number.isFinite(delta) || delta === 0) {
      flash("Change must be a non-zero number.", true);
      return;
    }
    setBusyAction("manual");
    try {
      await patchEntry(selectedHospitalId, formEntryId, {
        change: delta,
        source: "DEMO_BUTTON",
        message: `Admin manual update: ${delta > 0 ? "+" : ""}${delta}`,
      });
      flash(`Applied change of ${delta} to inventory entry.`);
      await refreshHospitals();
    } catch (err) {
      flash(err.message, true);
    } finally {
      setBusyAction(null);
    }
  };

  const findEntryByItemName = (substr) => {
    const target = substr.toLowerCase();
    return inventory.find((e) => {
      const name = (itemMap.get(e.itemId)?.name ?? "").toLowerCase();
      return name.includes(target);
    });
  };

  const triggerShortage = async (substr, label) => {
    if (!selectedHospitalId) return;
    const entry = findEntryByItemName(substr);
    if (!entry) {
      flash(`No "${label}" inventory entry found at this hospital.`, true);
      return;
    }
    setBusyAction(`shortage:${substr}`);
    try {
      await patchEntry(selectedHospitalId, entry.id, {
        count: 0,
        source: "DEMO_BUTTON",
        message: `Demo trigger: ${label} shortage`,
      });
      flash(`Triggered ${label} shortage at ${selectedHospital.name}.`);
      await refreshHospitals();
    } catch (err) {
      flash(err.message, true);
    } finally {
      setBusyAction(null);
    }
  };

  const resetInventory = async () => {
    if (!selectedHospitalId || inventory.length === 0) return;
    setBusyAction("reset");
    try {
      for (const entry of inventory) {
        const target = Math.max(entry.threshold * 3, 10);
        if (entry.count === target) continue;
        await patchEntry(selectedHospitalId, entry.id, {
          count: target,
          source: "DEMO_BUTTON",
          message: "Demo trigger: reset inventory to surplus",
        });
      }
      flash(`Reset all inventory at ${selectedHospital.name}.`);
      await refreshHospitals();
    } catch (err) {
      flash(err.message, true);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface-bright">
      <header className="flex-shrink-0 px-6 md:px-10 py-6 border-b border-outline-variant bg-white">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-fuchsia-100 text-fuchsia-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest">
            Admin / Test
          </span>
          <span className="text-on-surface-variant font-medium text-xs">
            Hackathon controls
          </span>
        </div>
        <h2 className="text-2xl font-bold text-on-surface">
          Demo Control Panel
        </h2>
        <p className="text-sm text-on-surface-variant mt-1 max-w-2xl">
          Inspect live state, push manual inventory changes, and trigger demo
          shortages when voice or live input isn't available.
        </p>
      </header>

      {(actionMessage || actionError) && (
        <div
          className={`mx-6 md:mx-10 mt-4 px-4 py-3 rounded-lg text-sm border ${
            actionError
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}
        >
          {actionError ?? actionMessage}
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <section className="xl:col-span-2 bg-white border border-outline-variant rounded-2xl p-5 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">
                    local_hospital
                  </span>
                  Hospital Inventory
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Pick a hospital to see its live inventory.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedHospitalId}
                  onChange={(e) => {
                    setSelectedHospitalId(e.target.value);
                    setFormEntryId("");
                  }}
                  className="bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none min-w-[220px]"
                >
                  <option value="">Select hospital…</option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={refreshHospitals}
                  className="px-3 py-2 text-xs font-bold rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container"
                  title="Refresh"
                >
                  <span className="material-symbols-outlined text-[18px] align-middle">
                    refresh
                  </span>
                </button>
              </div>
            </div>

            {loadingData ? (
              <p className="text-sm text-on-surface-variant py-8 text-center">
                Loading hospitals…
              </p>
            ) : !selectedHospital ? (
              <p className="text-sm text-on-surface-variant py-8 text-center">
                Pick a hospital above to view its inventory.
              </p>
            ) : inventory.length === 0 ? (
              <p className="text-sm text-on-surface-variant py-8 text-center">
                No inventory entries for this hospital.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant border-b border-outline-variant">
                      <th className="py-2 pr-3 font-bold">Item</th>
                      <th className="py-2 pr-3 font-bold text-right">Count</th>
                      <th className="py-2 pr-3 font-bold text-right">
                        Available
                      </th>
                      <th className="py-2 pr-3 font-bold text-right">
                        Threshold
                      </th>
                      <th className="py-2 pr-3 font-bold">Status</th>
                      <th className="py-2 font-bold">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-surface-container hover:bg-surface-container-lowest"
                      >
                        <td className="py-2 pr-3 font-medium text-on-surface">
                          {itemLabel(entry.itemId)}
                        </td>
                        <td className="py-2 pr-3 font-mono text-right">
                          {entry.count}
                        </td>
                        <td className="py-2 pr-3 font-mono text-right">
                          {entry.availableCount}
                        </td>
                        <td className="py-2 pr-3 font-mono text-right text-on-surface-variant">
                          {entry.threshold}
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              STATUS_STYLES[entry.status] ??
                              "bg-zinc-50 text-zinc-700 border-zinc-200"
                            }`}
                          >
                            {entry.status}
                          </span>
                        </td>
                        <td className="py-2 text-xs text-on-surface-variant">
                          {formatTimestamp(entry.lastUpdated)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm space-y-5">
            <div>
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  edit_document
                </span>
                Manual Update
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Apply a positive (added) or negative (used) delta to a specific
                inventory entry.
              </p>
            </div>
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                  Inventory Item
                </label>
                <select
                  value={formEntryId}
                  onChange={(e) => setFormEntryId(e.target.value)}
                  disabled={!selectedHospitalId}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:opacity-50"
                >
                  <option value="">Select item…</option>
                  {inventory.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {itemLabel(entry.itemId)} — {entry.count} on hand
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                  Change (delta)
                </label>
                <input
                  type="number"
                  value={formChange}
                  onChange={(e) => setFormChange(e.target.value)}
                  placeholder="e.g. -5"
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-sm text-on-surface font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                <p className="text-[11px] text-on-surface-variant mt-1">
                  Negative = used, positive = added.
                </p>
              </div>
              <button
                type="submit"
                disabled={busyAction === "manual"}
                className="w-full py-2.5 bg-primary text-white font-bold rounded-xl shadow-sm hover:opacity-90 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">
                  send
                </span>
                {busyAction === "manual" ? "Submitting…" : "Submit Update"}
              </button>
            </form>

            <div className="pt-4 border-t border-surface-container space-y-3">
              <div>
                <h4 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-fuchsia-600">
                    bolt
                  </span>
                  Demo Triggers
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  One-click scenarios for the judges' demo.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  disabled={
                    !selectedHospitalId || busyAction === "shortage:o-neg"
                  }
                  onClick={() => triggerShortage("o-neg", "O-Negative blood")}
                  className="w-full py-2 text-sm font-bold rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-all disabled:opacity-50"
                >
                  Trigger O-Neg Shortage
                </button>
                <button
                  type="button"
                  disabled={
                    !selectedHospitalId || busyAction === "shortage:ventilator"
                  }
                  onClick={() => triggerShortage("ventilator", "Ventilator")}
                  className="w-full py-2 text-sm font-bold rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all disabled:opacity-50"
                >
                  Trigger Ventilator Shortage
                </button>
                <button
                  type="button"
                  disabled={!selectedHospitalId || busyAction === "reset"}
                  onClick={resetInventory}
                  className="w-full py-2 text-sm font-bold rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all disabled:opacity-50"
                >
                  {busyAction === "reset"
                    ? "Resetting…"
                    : "Reset Inventory (Surplus)"}
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">
                    swap_horiz
                  </span>
                  Active Transfer Requests
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchTransferRequests()}
                  disabled={transfersLoading}
                  className="px-2 py-1 text-[11px] font-bold rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
                  title="Refresh transfer requests"
                >
                  <span
                    className={`material-symbols-outlined text-[16px] align-middle ${
                      transfersLoading ? "animate-spin" : ""
                    }`}
                  >
                    refresh
                  </span>
                </button>
                <span className="bg-error-container text-on-error-container text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
                  Live
                </span>
              </div>
            </div>
            {transferError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                Failed to load transfer requests: {transferError}
              </p>
            )}
            {transfersLoading && transferRequests.length === 0 ? (
              <p className="text-sm text-on-surface-variant py-8 text-center">
                Loading transfer requests…
              </p>
            ) : transferRequests.length === 0 ? (
              <p className="text-sm text-on-surface-variant py-8 text-center">
                No active transfer requests.
              </p>
            ) : (
              <ul className="space-y-2">
                {transferRequests.map((req) => {
                  const key = req.requestId ?? req.id;
                  const itemName =
                    req.itemName ?? (req.itemId ? itemLabel(req.itemId) : "—");
                  const fromName =
                    req.fromHospitalName ??
                    hospitalMap.get(req.fromHospitalId)?.name ??
                    req.fromHospitalId;
                  const toName = req.toHospitalId
                    ? req.toHospitalName ??
                      hospitalMap.get(req.toHospitalId)?.name ??
                      req.toHospitalId
                    : null;
                  return (
                    <li
                      key={key}
                      className="border border-outline-variant rounded-xl p-3 hover:bg-surface-container-lowest"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-start gap-2 mb-1.5">
                            <span className="text-sm font-bold text-on-surface">
                              {itemName} ×{req.quantity}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                                TRANSFER_STATUS_STYLES[req.status] ??
                                "bg-zinc-50 text-zinc-700 border-zinc-200"
                              }`}
                            >
                              {req.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-on-surface-variant font-mono mb-1">
                            {String(key).slice(0, 8)}…
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            <span className="font-medium">{fromName}</span> →{" "}
                            {toName ? (
                              <span className="font-medium">{toName}</span>
                            ) : (
                              <span className="font-medium italic text-amber-700">
                                unassigned
                              </span>
                            )}
                          </p>
                          {req.reason && (
                            <p className="text-[11px] text-on-surface-variant italic mt-1">
                              {req.reason}
                            </p>
                          )}
                          <p className="text-[10px] text-on-surface-variant mt-1 font-mono">
                            {formatTimestamp(req.createdAt)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0 justify-end">
                          {renderTransferAdminActions(req)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">
                    receipt_long
                  </span>
                  Recent Activity
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Last 20 inventory changes, newest first.
                </p>
              </div>
            </div>
            {activityLogs.length === 0 ? (
              <p className="text-sm text-on-surface-variant py-8 text-center">
                No activity yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {activityLogs.map((log) => {
                  const sign = log.change > 0 ? "+" : "";
                  return (
                    <li
                      key={log.id}
                      className="border border-outline-variant rounded-xl p-3"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-on-surface truncate">
                            {hospitalMap.get(log.hospitalId)?.name ??
                              log.hospitalId}
                          </p>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            <span className="font-mono">
                              {sign}
                              {log.change}
                            </span>{" "}
                            ({log.previousCount} → {log.newCount})
                          </p>
                          <p className="text-[11px] text-on-surface-variant mt-0.5">
                            {log.performedBy?.type === "nurse"
                              ? log.performedBy.name
                              : log.performedBy?.label ?? "System"}
                          </p>
                          {log.message && (
                            <p className="text-[11px] text-on-surface-variant italic mt-1 truncate">
                              {log.message}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              SOURCE_STYLES[log.source] ??
                              "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {log.source ?? "SYSTEM"}
                          </span>
                          <span className="text-[10px] text-on-surface-variant font-mono">
                            {formatTimestamp(log.createdAt)}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </main>

      {donorPickerRequest && (
        <AdminTransferDonorPickerModal
          request={donorPickerRequest}
          candidates={donorCandidates}
          showAll={showAllInDonorPicker}
          onToggleShowAll={() => setShowAllInDonorPicker((v) => !v)}
          onClose={closeDonorPicker}
          onSelect={(hospitalId) => assignDonorHospital(donorPickerRequest, hospitalId)}
          busy={
            busyTransferId === transferRequestPrimaryId(donorPickerRequest)
          }
        />
      )}
    </div>
  );
};

export default AdminView;
