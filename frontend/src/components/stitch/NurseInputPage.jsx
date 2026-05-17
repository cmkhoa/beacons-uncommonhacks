import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '../../lib/api';
import { VoiceAssistant } from '../VoiceAssistant';

const CATEGORY_DEFS = [
  { id: 'PPE', label: 'PPE' },
  { id: 'LIFE_SUPPORT', label: 'Life Support' },
  { id: 'BLOOD', label: 'Blood' },
  { id: 'MEDICATION', label: 'Medication' },
  { id: 'GENERAL_SUPPLIES', label: 'General Supplies' },
];

const CATEGORY_OTHER = 'OTHER';

const ACTION_LABELS = {
  used: 'Used',
  removed: 'Removed',
  added: 'Added',
};

const NurseInputPage = ({ session, isEmbedded = false }) => {
  const [hospital, setHospital] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);

  const [requestType, setRequestType] = useState('INVENTORY_UPDATE');

  // ── Section 3A: inventory update ───────────────────────────────────────
  const [invCategory, setInvCategory] = useState('');
  const [invEntryId, setInvEntryId] = useState('');
  const [invAction, setInvAction] = useState('used'); // 'used' | 'removed' | 'added'
  const [invQuantity, setInvQuantity] = useState('');
  const [invNote, setInvNote] = useState('');

  // ── Section 3B: emergency request ──────────────────────────────────────
  const [erCategory, setErCategory] = useState('');
  const [erItemId, setErItemId] = useState('');
  const [erCustomItemName, setErCustomItemName] = useState('');
  const [erQuantity, setErQuantity] = useState('');
  const [erReason, setErReason] = useState('');

  // ── Submission feedback ────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { kind: 'success' | 'error', text }

  const loadData = useCallback(async () => {
    if (!session?.hospitalId) return;
    setLoadingData(true);
    setDataError(null);
    try {
      const [hData, iData] = await Promise.all([
        apiGet(`/api/hospitals/${session.hospitalId}`),
        apiGet('/api/items'),
      ]);
      setHospital(hData.hospital ?? null);
      setItems(iData.items ?? []);
    } catch (err) {
      setDataError(err.message);
    } finally {
      setLoadingData(false);
    }
  }, [session?.hospitalId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const allInventoryEntries = useMemo(() => {
    if (!hospital?.inventory) return [];
    return hospital.inventory.map((entry) => ({
      ...entry,
      hospitalId: entry.hospitalId ?? hospital.id,
      hospitalName: hospital.name,
    }));
  }, [hospital]);

  const availableInventoryEntries = useMemo(
    () =>
      allInventoryEntries.filter(
        (entry) => Number(entry.availableCount ?? 0) > 0
      ),
    [allInventoryEntries]
  );

  const hospitalCategories = useMemo(() => {
    const ids = new Set();
    for (const entry of availableInventoryEntries) {
      const cat = itemMap.get(entry.itemId)?.category;
      if (cat) ids.add(cat);
    }
    return CATEGORY_DEFS.filter((c) => ids.has(c.id));
  }, [availableInventoryEntries, itemMap]);

  const emergencyCategories = useMemo(
    () => [...hospitalCategories, { id: CATEGORY_OTHER, label: 'Other' }],
    [hospitalCategories]
  );

  const inventoryEntriesForCategory = useMemo(() => {
    if (!invCategory) return [];
    return availableInventoryEntries.filter((entry) => {
      const item = itemMap.get(entry.itemId);
      return item?.category === invCategory;
    });
  }, [availableInventoryEntries, itemMap, invCategory]);

  const catalogItemsForErCategory = useMemo(() => {
    if (!erCategory || erCategory === CATEGORY_OTHER) return [];
    return items
      .filter((i) => i.category === erCategory)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, erCategory]);

  useEffect(() => {
    if (hospitalCategories.length === 0) return;
    setInvCategory((prev) =>
      prev && hospitalCategories.some((c) => c.id === prev)
        ? prev
        : hospitalCategories[0].id
    );
    setErCategory((prev) =>
      prev && emergencyCategories.some((c) => c.id === prev)
        ? prev
        : hospitalCategories[0].id
    );
  }, [hospitalCategories, emergencyCategories]);

  useEffect(() => {
    setInvEntryId((prev) =>
      inventoryEntriesForCategory.some((e) => e.id === prev) ? prev : ''
    );
  }, [inventoryEntriesForCategory]);

  useEffect(() => {
    setErItemId('');
    setErCustomItemName('');
  }, [erCategory]);

  const emergencyHospital = hospital;

  const flash = (kind, text) => {
    setFeedback({ kind, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  // ── Submit: Inventory Update ───────────────────────────────────────────
  const submitInventoryUpdate = async (e) => {
    e.preventDefault();
    if (!session?.userId || !session?.hospitalId) {
      flash('error', 'Sign in again to submit inventory updates.');
      return;
    }
    if (!invCategory) {
      flash('error', 'Please pick a category.');
      return;
    }
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
    const change = invAction === 'added' ? qty : -qty;
    const actionLabel = ACTION_LABELS[invAction] ?? invAction;
    const message =
      invNote.trim() ||
      `${actionLabel} ${qty} ${itemName} at ${entry.hospitalName}`;

    setSubmitting(true);
    try {
      await apiPatch(
        `/api/hospitals/${entry.hospitalId}/inventory/${entry.id}`,
        {
          change,
          adjustmentType: 'stock',
          nurseId: session.userId,
          source: 'MANUAL_FORM',
          message,
        }
      );
      await loadData();
      flash(
        'success',
        `Logged: ${invAction === 'added' ? '+' : '-'}${qty} ${itemName} (${actionLabel}).`
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
    if (!session?.userId || !session?.hospitalId) {
      flash('error', 'Sign in again to submit requests.');
      return;
    }
    if (!emergencyHospital) {
      flash('error', 'No destination hospital available.');
      return;
    }
    if (!erCategory) {
      flash('error', 'Please pick a category.');
      return;
    }

    const isOther = erCategory === CATEGORY_OTHER;
    const catalogItem = items.find((i) => i.id === erItemId);
    const displayName = isOther
      ? erCustomItemName.trim()
      : catalogItem?.name;

    if (!displayName) {
      flash(
        'error',
        isOther ? 'Please enter the requested item.' : 'Please select an item.'
      );
      return;
    }

    const qty = Number(erQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      flash('error', 'Quantity needed must be a positive number.');
      return;
    }

    const reason = [
      `${displayName} × ${qty}`,
      erReason.trim() ? `Notes: ${erReason.trim()}` : null,
    ]
      .filter(Boolean)
      .join(' ');

    const payload = {
      fromHospitalId: emergencyHospital.id,
      quantity: qty,
      reason,
      staffName: session.userName,
    };

    if (isOther) {
      payload.itemName = displayName;
      payload.itemCategory = 'GENERAL_SUPPLIES';
    } else {
      if (!catalogItem) {
        flash('error', 'Please select a valid catalog item.');
        return;
      }
      payload.itemId = catalogItem.id;
    }

    setSubmitting(true);
    try {
      await apiPost('/api/requests', payload);
      flash('success', `Emergency request sent: ${qty} × ${displayName}.`);
      setErItemId('');
      setErCustomItemName('');
      setErQuantity('');
      setErReason('');
    } catch (err) {
      flash('error', err.message);
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
        <div className="max-w-3xl mx-auto space-y-6">
          {/* ── Form ─────────────────────────────────────────────────── */}
          <div className="space-y-6">
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
                      disabled={loadingData || hospitalCategories.length === 0}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:opacity-50"
                    >
                      {hospitalCategories.length === 0 ? (
                        <option value="">No categories</option>
                      ) : (
                        hospitalCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))
                      )}
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
                        loadingData ||
                        !invCategory ||
                        inventoryEntriesForCategory.length === 0
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
                            {item?.name ?? entry.itemId} ({entry.count} on hand)
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
                        Used
                      </button>
                      <button
                        type="button"
                        onClick={() => setInvAction('removed')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                          invAction === 'removed'
                            ? 'bg-white shadow-sm text-amber-700'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        Removed
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
                <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-error">
                    e911_emergency
                  </span>
                  Emergency Supply Request
                </h3>

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
                      {emergencyCategories.map((c) => (
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
                    {erCategory === CATEGORY_OTHER ? (
                      <input
                        type="text"
                        value={erCustomItemName}
                        onChange={(e) => setErCustomItemName(e.target.value)}
                        placeholder="e.g. Cyanide antidote kit"
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-error/20 focus:border-error outline-none"
                      />
                    ) : (
                      <select
                        value={erItemId}
                        onChange={(e) => setErItemId(e.target.value)}
                        disabled={
                          !erCategory || catalogItemsForErCategory.length === 0
                        }
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-error/20 focus:border-error outline-none disabled:opacity-50"
                      >
                        <option value="">
                          {catalogItemsForErCategory.length === 0
                            ? 'No items in this category'
                            : 'Select item…'}
                        </option>
                        {catalogItemsForErCategory.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

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

          <VoiceAssistant
            session={session}
            hospital={hospital}
            inventoryEntries={allInventoryEntries}
            itemMap={itemMap}
          />
        </div>
      </main>
    </div>
  );
};

export default NurseInputPage;
