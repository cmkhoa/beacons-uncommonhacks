import { db } from "../config/firebase-config.js";
import { logInventoryChange } from "../utils/logger.js";
import type { InventoryEntry, Log, TransferRequest, InventoryStatus } from "../models/index.js";
import { Timestamp } from "firebase-admin/firestore";
import { getHospitalById } from "./hospitalService.js";
import { autoCreateTransfer } from "./transferService.js";
import { getInventoryStatus } from "../utils/status.js";

const HOSPITALS = "hospitals";
const INVENTORY_SUB = "inventory";
const TRANSFER_REQUESTS = "transfer_requests";

// ── Single-hospital queries ─────────────────────────────────────────────

/**
 * Get all inventory entries for a specific hospital.
 */
export async function getInventoryForHospital(
  hospitalId: string
): Promise<InventoryEntry[]> {
  const snap = await db
    .collection(HOSPITALS)
    .doc(hospitalId)
    .collection(INVENTORY_SUB)
    .get();
  return snap.docs.map((d) => ({
    id: d.id,
    hospitalId,
    ...(d.data() as Omit<InventoryEntry, "id" | "hospitalId">),
  }));
}

/**
 * Get a single inventory entry by its doc ID within a hospital.
 */
export async function getInventoryEntry(
  hospitalId: string,
  entryId: string
): Promise<InventoryEntry | null> {
  const doc = await db
    .collection(HOSPITALS)
    .doc(hospitalId)
    .collection(INVENTORY_SUB)
    .doc(entryId)
    .get();
  if (!doc.exists) return null;
  return {
    id: doc.id,
    hospitalId,
    ...(doc.data() as Omit<InventoryEntry, "id" | "hospitalId">),
  };
}

/**
 * Find a hospital's inventory entry for a specific global item.
 */
export async function getInventoryEntryByItemId(
  hospitalId: string,
  itemId: string
): Promise<InventoryEntry | null> {
  const snap = await db
    .collection(HOSPITALS)
    .doc(hospitalId)
    .collection(INVENTORY_SUB)
    .where("itemId", "==", itemId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return {
    id: doc.id,
    hospitalId,
    ...(doc.data() as Omit<InventoryEntry, "id" | "hospitalId">),
  };
}

/**
 * Update fields on a specific inventory entry.
 */
export async function updateInventoryEntry(
  hospitalId: string,
  entryId: string,
  updateData: Partial<InventoryEntry>
): Promise<void> {
  await db
    .collection(HOSPITALS)
    .doc(hospitalId)
    .collection(INVENTORY_SUB)
    .doc(entryId)
    .update(updateData as Record<string, unknown>);
}

// ── Cross-hospital queries ──────────────────────────────────────────────

/**
 * Find all inventory entries for a given global itemId across all hospitals.
 */
export async function getInventoryEntriesByItemId(
  itemId: string
): Promise<InventoryEntry[]> {
  const snap = await db
    .collectionGroup(INVENTORY_SUB)
    .where("itemId", "==", itemId)
    .get();
  return snap.docs.map((d) => {
    const hospitalId = d.ref.parent.parent!.id;
    return {
      id: d.id,
      hospitalId,
      ...(d.data() as Omit<InventoryEntry, "id" | "hospitalId">),
    };
  });
}

/**
 * Get ALL inventory entries across every hospital.
 */
export async function getAllInventoryEntries(): Promise<InventoryEntry[]> {
  const snap = await db.collectionGroup(INVENTORY_SUB).get();
  return snap.docs.map((d) => {
    const hospitalId = d.ref.parent.parent!.id;
    return {
      id: d.id,
      hospitalId,
      ...(d.data() as Omit<InventoryEntry, "id" | "hospitalId">),
    };
  });
}

// ── Transfer Requests ───────────────────────────────────────────────────

export async function createTransferRequest(
  data: Omit<TransferRequest, "requestId">
): Promise<string> {
  const ref = await db.collection(TRANSFER_REQUESTS).add(data);
  return ref.id;
}

// ── Logging ─────────────────────────────────────────────────────────────

export async function createInventoryLog(data: Log): Promise<void> {
  const { id: _id, createdAt: _createdAt, ...payload } = data;
  await logInventoryChange(payload);
}

// ── Business Logic ──────────────────────────────────────────────────────



export type InventoryUpdateSource =
  | "VOICE_COMMAND"
  | "MANUAL_FORM"
  | "DEMO_BUTTON"
  | "SYSTEM";

export interface ProcessInventoryUpdateInput {
  hospitalId: string;
  entryId: string;
  change: number;
  source?: InventoryUpdateSource;
  message?: string;
}

export interface ProcessInventoryUpdateResult {
  success: boolean;
  hospitalId: string;
  entryId: string;
  itemId: string;
  previousCount: number;
  newCount: number;
  previousAvailableCount: number;
  newAvailableCount: number;
  status: InventoryStatus;
  log: Log;
  transferRequest: TransferRequest | null;
}

/**
 * Apply an inventory delta, log it, and auto-create a transfer request
 * when the new state is LOW or CRITICAL_SHORTAGE.
 */
export async function processInventoryUpdate(
  input: ProcessInventoryUpdateInput
): Promise<ProcessInventoryUpdateResult> {
  const { hospitalId, entryId, change } = input;

  if (!hospitalId || !entryId) {
    throw new Error("hospitalId and entryId are required");
  }
  if (typeof change !== "number" || !Number.isFinite(change)) {
    throw new Error("change must be a finite number");
  }

  const source: InventoryUpdateSource = input.source ?? "SYSTEM";
  const now = Timestamp.now();

  const hospital = await getHospitalById(hospitalId);
  if (!hospital) throw new Error(`Hospital not found: ${hospitalId}`);

  const entry = await getInventoryEntry(hospitalId, entryId);
  if (!entry) throw new Error(`Inventory entry not found: ${entryId} @ ${hospitalId}`);

  // 1. Apply delta
  const previousCount = entry.count;
  const newCount = Math.max(previousCount + change, 0);
  const previousAvailableCount = Math.max(entry.count - entry.inUseCount, 0);
  const newAvailableCount = Math.max(newCount - entry.inUseCount, 0);
  const newStatus = getInventoryStatus(newAvailableCount, entry.threshold);

  await updateInventoryEntry(hospitalId, entry.id!, {
    count: newCount,
    availableCount: newAvailableCount,
    status: newStatus,
    lastUpdated: now,
  });

  // 2. Log
  const log: Log = {
    id: "",
    hospitalId,
    inventoryEntryId: entry.id!,
    previousCount,
    change,
    newCount,
    previousAvailableCount,
    newAvailableCount,
    source,
    message: input.message,
    createdAt: now,
  };
  await createInventoryLog(log);

  // 3. Auto-transfer if shortage
  let transferRequest: TransferRequest | null = null;
  if (newStatus === "LOW" || newStatus === "CRITICAL_SHORTAGE") {
    const quantityNeeded = Math.max(entry.threshold - newAvailableCount, 1);
    transferRequest = await autoCreateTransfer(hospital, entry.itemId, quantityNeeded, newStatus);
  }

  return {
    success: true,
    hospitalId,
    entryId: entry.id!,
    itemId: entry.itemId,
    previousCount,
    newCount,
    previousAvailableCount,
    newAvailableCount,
    status: newStatus,
    log,
    transferRequest,
  };
}
