import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../lib/api";

const STATUS_PILL = {
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  APPROVED: "bg-sky-50 text-sky-700 border border-sky-200",
  IN_TRANSIT: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  CANCELLED: "bg-zinc-100 text-zinc-600 border border-zinc-200",
};

const SupplyMatchmakerRouting = ({ session, isEmbedded = false }) => {
  const role = session?.role ?? null;
  const canManage = role === "dispatcher" || role === "admin";
  const canVolunteer = role === "nurse" && Boolean(session?.hospitalId);
  const nurseHospitalId = canVolunteer ? session.hospitalId : null;
  const [requests, setRequests] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [donorPickerRequest, setDonorPickerRequest] = useState(null);
  const [showAllInPicker, setShowAllInPicker] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqData, hospData, itemsData] = await Promise.all([
        apiGet("/api/requests"),
        apiGet("/api/hospitals?hydrate=true"),
        apiGet("/api/items"),
      ]);
      setRequests(reqData.requests ?? []);
      setHospitals(hospData.hospitals ?? []);
      setItems(itemsData.items ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const flash = (kind, text) => {
    setFeedback({ kind, text });
    setTimeout(() => setFeedback(null), 4500);
  };

  const mutate = async (req, path, label, body) => {
    setBusyId(req.requestId);
    try {
      await apiPost(path, body ?? {});
      flash("success", `${label}: ${req.itemName} × ${req.quantity}.`);
      await loadAll();
      return true;
    } catch (err) {
      flash("error", err.message);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const approve = (req) =>
    mutate(req, `/api/requests/${req.requestId}/approve`, "Approved");

  const complete = (req) =>
    mutate(req, `/api/requests/${req.requestId}/complete`, "Completed");

  const assignDonor = async (req, toHospitalId) => {
    const ok = await mutate(
      req,
      `/api/requests/${req.requestId}/assign-donor`,
      "Donor assigned",
      { toHospitalId }
    );
    if (ok) {
      setDonorPickerRequest(null);
      setShowAllInPicker(false);
    }
  };

  const openDonorPicker = (req) => {
    setDonorPickerRequest(req);
    setShowAllInPicker(false);
  };

  const closeDonorPicker = () => {
    if (busyId) return;
    setDonorPickerRequest(null);
    setShowAllInPicker(false);
  };

  // ── Donor candidate computation ────────────────────────────────────────
  const donorCandidates = useMemo(() => {
    if (!donorPickerRequest) return { recommended: [], others: [] };
    const target = donorPickerRequest;
    const targetCategory =
      target.itemCategory ?? itemMap.get(target.itemId)?.category ?? null;

    const recommended = [];
    const others = [];

    for (const h of hospitals) {
      if (!h?.id || h.id === target.fromHospitalId) continue;

      const inventory = h.inventory ?? [];
      // Prefer exact itemId match, fall back to same-category surplus.
      let surplusEntry = inventory.find(
        (e) => e.itemId === target.itemId && e.status === "SURPLUS"
      );
      if (!surplusEntry && targetCategory) {
        surplusEntry = inventory.find((e) => {
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
      // exact item matches first, then by headroom desc
      if (a.exactMatch !== b.exactMatch) return a.exactMatch ? -1 : 1;
      return b.headroom - a.headroom;
    });
    others.sort((a, b) => a.name.localeCompare(b.name));

    return { recommended, others };
  }, [donorPickerRequest, hospitals, itemMap]);

  // ── Action button renderer for a row ───────────────────────────────────
  const renderActions = (req) => {
    const isBusy = busyId === req.requestId;
    const baseBtn =
      "inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed";
    const readOnly = (text) => (
      <span className="text-[11px] text-on-surface-variant italic">{text}</span>
    );

    if (canManage) {
      if (!req.toHospitalId) {
        return (
          <button
            type="button"
            onClick={() => openDonorPicker(req)}
            disabled={isBusy}
            className={`${baseBtn} bg-white text-on-surface border border-outline-variant hover:bg-surface-container`}
          >
            <span className="material-symbols-outlined text-[14px]">hub</span>
            {isBusy ? "Working…" : "Assign Donor"}
          </button>
        );
      }
      if (req.status === "PENDING") {
        return (
          <button
            type="button"
            onClick={() => approve(req)}
            disabled={isBusy}
            className={`${baseBtn} bg-primary text-white hover:opacity-90 shadow-sm`}
          >
            <span className="material-symbols-outlined text-[14px]">
              check_circle
            </span>
            {isBusy ? "Approving…" : "Approve"}
          </button>
        );
      }
      if (req.status === "APPROVED" || req.status === "IN_TRANSIT") {
        return (
          <button
            type="button"
            onClick={() => complete(req)}
            disabled={isBusy}
            className={`${baseBtn} bg-emerald-600 text-white hover:opacity-90 shadow-sm`}
          >
            <span className="material-symbols-outlined text-[14px]">
              task_alt
            </span>
            {isBusy ? "Completing…" : "Complete"}
          </button>
        );
      }
      return readOnly("No action");
    }

    if (canVolunteer) {
      if (!req.toHospitalId) {
        if (req.fromHospitalId === nurseHospitalId) {
          return readOnly("Your request");
        }
        return (
          <button
            type="button"
            onClick={() => assignDonor(req, nurseHospitalId)}
            disabled={isBusy}
            className={`${baseBtn} bg-emerald-600 text-white hover:opacity-90 shadow-sm`}
            title="Offer your hospital as the donor for this request"
          >
            <span className="material-symbols-outlined text-[14px]">
              volunteer_activism
            </span>
            {isBusy ? "Volunteering…" : "Volunteer Our Hospital"}
          </button>
        );
      }
      return readOnly("—");
    }

    return readOnly("—");
  };

  return (
    <div
      className={`flex flex-col h-full overflow-hidden bg-background ${
        isEmbedded ? "" : "h-screen"
      }`}
    >
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <section className="max-w-6xl mx-auto bg-white border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-outline-variant flex justify-between items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-on-surface">
                Transfer Missions
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                {canManage
                  ? "Assign donors, approve, and complete transfer missions."
                  : canVolunteer
                  ? "Volunteer your hospital as the donor for unassigned requests."
                  : "View active transfer missions."}
              </p>
            </div>
            <button
              type="button"
              onClick={loadAll}
              disabled={loading}
              className="inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
              title="Refresh"
            >
              <span
                className={`material-symbols-outlined text-[16px] ${
                  loading ? "animate-spin" : ""
                }`}
              >
                refresh
              </span>
              Refresh
            </button>
          </div>

          {feedback && (
            <div
              className={`mx-6 mt-4 px-4 py-3 rounded-lg text-sm border ${
                feedback.kind === "error"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              {feedback.text}
            </div>
          )}

          {loading && requests.length === 0 ? (
            <div className="p-6 text-sm text-on-surface-variant">
              Loading transfers…
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-red-700 bg-red-50 border-t border-red-100">
              Failed to load transfers: {error}
            </div>
          ) : requests.length === 0 ? (
            <div className="p-6 text-sm text-on-surface-variant">
              No active transfers.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container-lowest text-on-surface-variant">
                  <tr className="border-b border-outline-variant">
                    <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest">
                      Mission
                    </th>
                    <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest">
                      Requester
                    </th>
                    <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest">
                      Donor
                    </th>
                    <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest">
                      Item
                    </th>
                    <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest">
                      Status
                    </th>
                    <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {requests.map((request) => {
                    const pillClass =
                      STATUS_PILL[request.status] ??
                      "bg-surface-container text-on-surface-variant border border-outline-variant";
                    return (
                      <tr
                        key={request.requestId ?? request.id}
                        className="hover:bg-surface-bright"
                      >
                        <td className="px-6 py-4 font-mono text-xs text-on-surface-variant">
                          {(request.requestId ?? request.id ?? "").slice(0, 8)}
                        </td>
                        <td className="px-6 py-4 font-medium text-on-surface">
                          {request.fromHospitalName ?? request.fromHospitalId}
                        </td>
                        <td className="px-6 py-4 text-on-surface">
                          {request.toHospitalName || request.toHospitalId ? (
                            <span>
                              {request.toHospitalName ?? request.toHospitalId}
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-on-surface">
                          <span className="font-medium">
                            {request.itemName}
                          </span>
                          <span className="text-on-surface-variant">
                            {" "}
                            × {request.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${pillClass}`}
                          >
                            {request.status ?? "PENDING"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {renderActions(request)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {donorPickerRequest && canManage && (
        <DonorPickerModal
          request={donorPickerRequest}
          candidates={donorCandidates}
          showAll={showAllInPicker}
          onToggleShowAll={() => setShowAllInPicker((v) => !v)}
          onClose={closeDonorPicker}
          onSelect={(hospitalId) => assignDonor(donorPickerRequest, hospitalId)}
          busy={busyId === donorPickerRequest.requestId}
        />
      )}
    </div>
  );
};

const DonorPickerModal = ({
  request,
  candidates,
  showAll,
  onToggleShowAll,
  onClose,
  onSelect,
  busy,
}) => {
  const { recommended, others } = candidates;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-outline-variant w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-outline-variant flex justify-between items-start gap-4">
          <div>
            <h3 className="text-lg font-bold text-on-surface">
              Assign Donor Hospital
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Requester:{" "}
              <strong>
                {request.fromHospitalName ?? request.fromHospitalId}
              </strong>
              {" · "}
              Need:{" "}
              <strong>
                {request.itemName} × {request.quantity}
              </strong>
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
                  <DonorRow
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
                    <DonorRow
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

const DonorRow = ({ row, onSelect, busy, highlight = false }) => {
  return (
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
};

export default SupplyMatchmakerRouting;
