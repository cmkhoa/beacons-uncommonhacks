import React, { useEffect, useMemo, useState } from 'react';

const API_BASE = 'http://localhost:5000';

const CATEGORIES = [
  { id: 'PPE', label: 'PPE' },
  { id: 'LIFE_SUPPORT', label: 'Life Support' },
  { id: 'BLOOD', label: 'Blood' },
  { id: 'MEDICATION', label: 'Medication' },
  { id: 'GENERAL_SUPPLIES', label: 'General Supplies' },
];

const URGENCY_LEVELS = [
  { id: 'CRITICAL', label: 'Critical' },
  { id: 'HIGH', label: 'High' },
  { id: 'NORMAL', label: 'Normal' },
];

const NEEDED_BY_OPTIONS = [
  { id: 'ASAP', label: 'ASAP' },
  { id: 'WITHIN_1H', label: 'Within 1 hour' },
  { id: 'WITHIN_4H', label: 'Within 4 hours' },
  { id: 'TODAY', label: 'Today' },
];

const PRESET_COMMANDS = [
  'We just used five ventilators.',
  'Our mask count is low.',
  'Add twenty boxes of gloves.',
  'We need more N95 masks.',
];

const NurseInputPage = ({ isEmbedded = false }) => {
  const [hospitals, setHospitals] = useState([]);
  const [items, setItems] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);

  const [requestType, setRequestType] = useState('INVENTORY_UPDATE');

  // ── Section 3A: inventory update ───────────────────────────────────────
  const [invCategory, setInvCategory] = useState('');
  const [invEntryId, setInvEntryId] = useState('');
  const [invAction, setInvAction] = useState('used'); // 'used' | 'added'
  const [invQuantity, setInvQuantity] = useState('');
  const [invNote, setInvNote] = useState('');

  // ── Section 3B: emergency request ──────────────────────────────────────
  const [erCategory, setErCategory] = useState('MEDICATION');
  const [erItemName, setErItemName] = useState('');
  const [erQuantity, setErQuantity] = useState('');
  const [erUrgency, setErUrgency] = useState('CRITICAL');
  const [erNeededBy, setErNeededBy] = useState('ASAP');
  const [erAllowSubstitutes, setErAllowSubstitutes] = useState(true);
  const [erReason, setErReason] = useState('');

  // ── Submission feedback ────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { kind: 'success' | 'error', text }

  // ── Voice assistant (kept as-is, demo only) ────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [beaconResponse, setBeaconResponse] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingData(true);
      setDataError(null);
      try {
        const [hRes, iRes] = await Promise.all([
          fetch(`${API_BASE}/api/hospitals?hydrate=true`),
          fetch(`${API_BASE}/api/items`),
        ]);
        if (!hRes.ok || !iRes.ok) throw new Error('Failed to load data');
        const hJson = await hRes.json();
        const iJson = await iRes.json();
        if (cancelled) return;
        setHospitals(hJson.hospitals ?? []);
        setItems(iJson.items ?? []);
      } catch (err) {
        if (!cancelled) setDataError(err.message);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const hospitalMap = useMemo(
    () => new Map(hospitals.map((h) => [h.id, h])),
    [hospitals]
  );

  // Flat list of every inventory entry across every hospital.
  const allInventoryEntries = useMemo(() => {
    return hospitals.flatMap((h) =>
      (h.inventory ?? []).map((entry) => ({
        ...entry,
        hospitalId: entry.hospitalId ?? h.id,
        hospitalName: h.name,
      }))
    );
  }, [hospitals]);

  const inventoryEntriesForCategory = useMemo(() => {
    if (!invCategory) return allInventoryEntries;
    return allInventoryEntries.filter((entry) => {
      const item = itemMap.get(entry.itemId);
      return item?.category === invCategory;
    });
  }, [allInventoryEntries, itemMap, invCategory]);

  useEffect(() => {
    setInvEntryId((prev) =>
      inventoryEntriesForCategory.some((e) => e.id === prev) ? prev : ''
    );
  }, [inventoryEntriesForCategory]);

  // Auto-pick first hospital as the destination for emergency requests.
  const emergencyHospital = hospitals[0];

  const flash = (kind, text) => {
    setFeedback({ kind, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  // ── Submit: Inventory Update ───────────────────────────────────────────
  const submitInventoryUpdate = async (e) => {
    e.preventDefault();
    if (!invEntryId) {
      flash('error', 'Please pick an item to update.');
      return;
    }
    const qty = Number(invQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      flash('error', 'Quantity must be a positive number.');
      return;
    }
    const entry = allInventoryEntries.find((e2) => e2.id === invEntryId);
    if (!entry) {
      flash('error', 'Selected item is no longer available.');
      return;
    }
    const itemName = itemMap.get(entry.itemId)?.name ?? 'item';
    const change = invAction === 'used' ? -qty : qty;
    const message =
      invNote.trim() ||
      `${invAction === 'used' ? 'Used' : 'Added'} ${qty} ${itemName} at ${entry.hospitalName}`;

    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/hospitals/${entry.hospitalId}/inventory/${entry.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            change,
            source: 'MANUAL_FORM',
            message,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `PATCH failed (${res.status})`);
      }
      flash(
        'success',
        `Logged: ${invAction === 'used' ? '-' : '+'}${qty} ${itemName}.`
      );
      setInvQuantity('');
      setInvNote('');
    } catch (err) {
      flash('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submit: Emergency Supply Request ───────────────────────────────────
  const submitEmergencyRequest = async (e) => {
    e.preventDefault();
    if (!emergencyHospital) {
      flash('error', 'No destination hospital available.');
      return;
    }
    if (!erItemName.trim()) {
      flash('error', 'Please enter the requested item.');
      return;
    }
    const qty = Number(erQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      flash('error', 'Quantity needed must be a positive number.');
      return;
    }

    // Try fuzzy-match an existing catalog item.
    const target = erItemName.trim().toLowerCase();
    let matchedItem = items.find((i) => i.name.toLowerCase() === target);
    if (!matchedItem) {
      matchedItem = items.find(
        (i) =>
          i.category === erCategory &&
          (i.name.toLowerCase().includes(target) ||
            target.includes(i.name.toLowerCase()))
      );
    }
    const resolvedItemId = matchedItem?.id ?? `RARE:${erItemName.trim()}`;
    const resolutionNote = matchedItem
      ? `matched catalog item ${matchedItem.name}`
      : 'free-text request, no catalog match';

    const reason = [
      `[${erUrgency}] ${erItemName.trim()} × ${qty}`,
      `Needed by: ${erNeededBy}. Substitutes ${
        erAllowSubstitutes ? 'allowed' : 'not allowed'
      }.`,
      `Category: ${erCategory}.`,
      erReason.trim() ? `Notes: ${erReason.trim()}` : null,
      `(${resolutionNote})`,
    ]
      .filter(Boolean)
      .join(' ');

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toHospitalId: emergencyHospital.id,
          itemId: resolvedItemId,
          quantity: qty,
          reason,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `POST failed (${res.status})`);
      }
      flash(
        'success',
        matchedItem
          ? `Emergency request sent: ${qty} × ${matchedItem.name}.`
          : `Emergency request sent (free-text): ${qty} × ${erItemName.trim()}.`
      );
      setErItemName('');
      setErQuantity('');
      setErReason('');
    } catch (err) {
      flash('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Voice assistant handlers (demo only) ───────────────────────────────
  const handleStartRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setTranscript('We just used five ventilators.');
        setBeaconResponse(
          "Got it. I've updated the inventory: 5 ventilators used. Your stock is now low, so I'm routing more from Mercy Hospital."
        );
      }, 2000);
    } else {
      setIsRecording(true);
      setTranscript('');
      setBeaconResponse(null);
    }
  };
  const handlePresetCommand = (command) => {
    if (isRecording) setIsRecording(false);
    setTranscript(command);
    setIsLoading(true);
    setBeaconResponse(null);
    setTimeout(() => {
      setIsLoading(false);
      setBeaconResponse("Got it. I've updated the inventory based on your command.");
    }, 2000);
  };
  const handlePlayResponse = () => {
    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), 3000);
  };

  return (
    <div
      className={`flex flex-col h-full overflow-hidden bg-surface-bright ${
        isEmbedded ? '' : 'h-screen'
      }`}
    >
      <header className="flex-shrink-0 px-6 md:px-10 py-6 border-b border-outline-variant bg-white">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest">
            Rapid Input
          </span>
          <span className="text-on-surface-variant font-medium text-xs">
            Nurse Station
          </span>
        </div>
        <h2 className="text-2xl font-bold text-on-surface">Nurse Supply Form</h2>
        <p className="text-sm text-on-surface-variant mt-1 max-w-2xl">
          Log inventory changes or escalate emergency supply needs. Hands-free
          updates via the voice assistant on the right.
        </p>
      </header>

      {feedback && (
        <div
          className={`mx-6 md:mx-10 mt-4 px-4 py-3 rounded-lg text-sm border ${
            feedback.kind === 'error'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {feedback.text}
        </div>
      )}
      {dataError && !feedback && (
        <div className="mx-6 md:mx-10 mt-4 px-4 py-3 rounded-lg text-sm border bg-red-50 text-red-700 border-red-200">
          Couldn't load data: {dataError}
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── LEFT: form ───────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Request Type */}
            <section className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  rule
                </span>
                Request Type
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRequestType('INVENTORY_UPDATE')}
                  className={`text-left px-4 py-3 rounded-xl border transition-all ${
                    requestType === 'INVENTORY_UPDATE'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-outline-variant hover:bg-surface-container-lowest'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-on-surface">
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        requestType === 'INVENTORY_UPDATE'
                          ? 'text-primary'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      edit_note
                    </span>
                    Inventory Update
                  </div>
                  <p className="text-[12px] text-on-surface-variant mt-1">
                    Common supplies (used or added)
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setRequestType('EMERGENCY_SUPPLY_REQUEST')}
                  className={`text-left px-4 py-3 rounded-xl border transition-all ${
                    requestType === 'EMERGENCY_SUPPLY_REQUEST'
                      ? 'border-error bg-error/5 shadow-sm'
                      : 'border-outline-variant hover:bg-surface-container-lowest'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-on-surface">
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        requestType === 'EMERGENCY_SUPPLY_REQUEST'
                          ? 'text-error'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      e911_emergency
                    </span>
                    Emergency Supply Request
                  </div>
                  <p className="text-[12px] text-on-surface-variant mt-1">
                    Rare items, antidotes, urgent escalations
                  </p>
                </button>
              </div>
            </section>

            {/* Section 3A: Inventory Update */}
            {requestType === 'INVENTORY_UPDATE' && (
              <form
                onSubmit={submitInventoryUpdate}
                className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm space-y-5"
              >
                <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">
                    inventory_2
                  </span>
                  Inventory Update
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      Category
                    </label>
                    <select
                      value={invCategory}
                      onChange={(e) => setInvCategory(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                      <option value="">All categories</option>
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      Item
                    </label>
                    <select
                      value={invEntryId}
                      onChange={(e) => setInvEntryId(e.target.value)}
                      disabled={
                        loadingData || inventoryEntriesForCategory.length === 0
                      }
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:opacity-50"
                    >
                      <option value="">
                        {loadingData
                          ? 'Loading…'
                          : inventoryEntriesForCategory.length === 0
                          ? 'No items available'
                          : 'Select item…'}
                      </option>
                      {inventoryEntriesForCategory.map((entry) => {
                        const item = itemMap.get(entry.itemId);
                        return (
                          <option key={entry.id} value={entry.id}>
                            {item?.name ?? entry.itemId} — {entry.hospitalName} ({entry.count} on hand)
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      Action
                    </label>
                    <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant">
                      <button
                        type="button"
                        onClick={() => setInvAction('used')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                          invAction === 'used'
                            ? 'bg-white shadow-sm text-error'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        Used / Removed
                      </button>
                      <button
                        type="button"
                        onClick={() => setInvAction('added')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                          invAction === 'added'
                            ? 'bg-white shadow-sm text-primary'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        Added
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={invQuantity}
                      onChange={(e) => setInvQuantity(e.target.value)}
                      placeholder="e.g. 5"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                    Note (optional)
                  </label>
                  <input
                    type="text"
                    value={invNote}
                    onChange={(e) => setInvNote(e.target.value)}
                    placeholder="e.g. Used during cardiac arrest in ER"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-sm hover:opacity-90 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                  {submitting ? 'Submitting…' : 'Submit Update'}
                </button>
              </form>
            )}

            {/* Section 3B: Emergency Supply Request */}
            {requestType === 'EMERGENCY_SUPPLY_REQUEST' && (
              <form
                onSubmit={submitEmergencyRequest}
                className="bg-white border border-error/30 rounded-2xl p-6 shadow-sm space-y-5"
              >
                <div>
                  <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-error">
                      e911_emergency
                    </span>
                    Emergency Supply Request
                  </h3>
                  {emergencyHospital && (
                    <p className="text-[11px] text-on-surface-variant mt-1">
                      Sending as: <span className="font-bold text-on-surface">{emergencyHospital.name}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      Category
                    </label>
                    <select
                      value={erCategory}
                      onChange={(e) => setErCategory(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-error/20 focus:border-error outline-none"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      Requested Item
                    </label>
                    <input
                      type="text"
                      value={erItemName}
                      onChange={(e) => setErItemName(e.target.value)}
                      placeholder="e.g. Cyanide antidote kit"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-error/20 focus:border-error outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      Quantity Needed
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={erQuantity}
                      onChange={(e) => setErQuantity(e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface font-mono focus:ring-2 focus:ring-error/20 focus:border-error outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      Urgency
                    </label>
                    <select
                      value={erUrgency}
                      onChange={(e) => setErUrgency(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-error/20 focus:border-error outline-none"
                    >
                      {URGENCY_LEVELS.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      Needed By
                    </label>
                    <select
                      value={erNeededBy}
                      onChange={(e) => setErNeededBy(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-error/20 focus:border-error outline-none"
                    >
                      {NEEDED_BY_OPTIONS.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={erAllowSubstitutes}
                      onChange={(e) => setErAllowSubstitutes(e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="font-medium text-on-surface">
                      Allow substitutes
                    </span>
                  </label>
                  <span className="text-[11px] text-on-surface-variant">
                    Donor hospital may send a clinically-equivalent item.
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                    Reason / Notes
                  </label>
                  <textarea
                    value={erReason}
                    onChange={(e) => setErReason(e.target.value)}
                    placeholder="e.g. Possible toxic exposure case in ER. Need antidote immediately."
                    rows={3}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-error/20 focus:border-error outline-none resize-y"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-error text-on-error font-bold rounded-xl shadow-sm hover:opacity-90 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    e911_emergency
                  </span>
                  {submitting ? 'Submitting…' : 'Submit Emergency Request'}
                </button>
              </form>
            )}
          </div>

          {/* ── RIGHT: voice assistant (unchanged from prior demo) ───── */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gradient-to-b from-indigo-50 to-white border border-indigo-100 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">mic</span>
                    Voice Assistant
                  </h3>
                  <p className="text-[11px] font-bold text-indigo-500/70 uppercase tracking-widest mt-1">
                    Autonomous Logging
                  </p>
                </div>
                <button
                  onClick={handleStartRecording}
                  className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform ${
                    isRecording
                      ? 'bg-error text-white animate-pulse scale-105'
                      : 'bg-primary text-white hover:scale-105 active:scale-95 group-hover:animate-pulse'
                  }`}
                >
                  <span className="material-symbols-outlined text-3xl">
                    {isRecording ? 'stop' : 'mic'}
                  </span>
                </button>
              </div>

              <p className="text-sm text-indigo-800/80 mb-6 leading-relaxed">
                Tap the microphone icon or say <strong>"Hey Beacon"</strong> to
                quickly log inventory changes while your hands are full.
              </p>

              {(isRecording || isLoading || transcript || beaconResponse) && (
                <div className="mb-6 bg-white rounded-xl p-4 border border-indigo-100 shadow-inner">
                  {isRecording && (
                    <div className="flex items-center gap-2 text-error font-medium animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-error"></div>
                      Listening...
                    </div>
                  )}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <span className="material-symbols-outlined animate-spin text-sm">
                        refresh
                      </span>
                      Processing voice input...
                    </div>
                  )}
                  {transcript && !isRecording && !isLoading && (
                    <div className="mb-3">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                        You said:
                      </p>
                      <p className="text-sm text-on-surface italic">
                        "{transcript}"
                      </p>
                    </div>
                  )}
                  {beaconResponse && !isLoading && (
                    <div className="mt-3 pt-3 border-t border-indigo-50">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">
                        Beacon Response:
                      </p>
                      <p className="text-sm text-indigo-900 font-medium mb-3">
                        {beaconResponse}
                      </p>
                      <button
                        onClick={handlePlayResponse}
                        className={`w-full py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                          isPlaying
                            ? 'bg-primary/20 text-primary'
                            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isPlaying ? 'volume_up' : 'play_arrow'}
                        </span>
                        {isPlaying ? 'Playing...' : 'Play Response'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                  Try saying...
                </p>
                {PRESET_COMMANDS.map((cmd, idx) => (
                  <div
                    key={idx}
                    onClick={() => handlePresetCommand(cmd)}
                    className="bg-white border border-indigo-100 rounded-xl p-3 shadow-sm hover:border-primary/40 cursor-pointer transition-colors flex gap-3 items-center"
                  >
                    <span className="material-symbols-outlined text-indigo-300">
                      chat
                    </span>
                    <p className="text-sm font-medium text-indigo-900">“{cmd}”</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NurseInputPage;
