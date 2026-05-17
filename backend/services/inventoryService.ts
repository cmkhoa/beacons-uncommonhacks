import { db } from "../config/firebase-config.js";
import { logInventoryChange } from "../utils/logger.js";
import type {
  InventoryEntry,
  Log,
  LogActor,
  InventoryStatus,
  TransferRequest,
} from "../models/index.js";
import { SYSTEM_LOG_ACTOR } from "../models/logActor.js";
import {
  assertNurseHospitalAccess,
  getUserById,
} from "./userService.js";
import { Timestamp } from "firebase-admin/firestore";
import { getHospitalById } from "./hospitalService.js";
import { autoCreateTransfer, hasActiveRequestForItem } from "./transferService.js";
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
  const allEntries = await getAllInventoryEntries();
  return allEntries.filter((e) => e.itemId === itemId);
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

export async function createInventoryLog(
  data: Omit<Log, "id" | "createdAt">
): Promise<void> {
  await logInventoryChange(data);
}

// ── Business Logic ──────────────────────────────────────────────────────



export type InventoryUpdateSource =
  | "VOICE_COMMAND"
  | "MANUAL_FORM"
  | "DEMO_BUTTON"
  | "SYSTEM";

export type InventoryAdjustmentType = "available" | "stock";

export interface ProcessInventoryUpdateInput {
  hospitalId: string;
  entryId: string;
  change: number;
  /**
   * "available" updates availableCount only, e.g. supplies used at bedside.
   * "stock" updates both count and availableCount, e.g. removed or added stock.
   */
  adjustmentType?: InventoryAdjustmentType;
  /** Nurse user id; omitted for system-attributed changes. */
  nurseId?: string;
  source?: InventoryUpdateSource;
  message?: string;
}

const SYSTEM_ATTRIBUTED_SOURCES: InventoryUpdateSource[] = [
  "SYSTEM",
  "DEMO_BUTTON",
];

async function resolveLogActor(
  hospitalId: string,
  nurseId: string | undefined,
  source: InventoryUpdateSource
): Promise<LogActor> {
  if (nurseId) {
    const user = await getUserById(nurseId);
    if (!user) throw new Error(`Nurse not found: ${nurseId}`);
    assertNurseHospitalAccess(user, hospitalId);
    return { type: "nurse", userId: user.id!, name: user.name };
  }

  if (SYSTEM_ATTRIBUTED_SOURCES.includes(source)) {
    return SYSTEM_LOG_ACTOR;
  }

  throw new Error(`nurseId is required for source "${source}"`);
}

/** Lean PATCH response — no duplicate log payload. */
export interface InventoryUpdateResponse {
  success: boolean;
  hospitalId: string;
  entryId: string;
  itemId: string;
  newCount: number;
  newAvailableCount: number;
  status: InventoryStatus;
  performedBy: LogActor;
  transferCreated: boolean;
}

/**
 * Apply an inventory delta, log it, and auto-create a transfer request
 * when the new state is LOW or CRITICAL_SHORTAGE.
 */
export async function processInventoryUpdate(
  input: ProcessInventoryUpdateInput
): Promise<InventoryUpdateResponse> {
  const { hospitalId, entryId, change } = input;

  if (!hospitalId || !entryId) {
    throw new Error("hospitalId and entryId are required");
  }
  if (typeof change !== "number" || !Number.isFinite(change)) {
    throw new Error("change must be a finite number");
  }

  const source: InventoryUpdateSource =
    input.source ?? (input.nurseId ? "MANUAL_FORM" : "SYSTEM");
  const now = Timestamp.now();
  const performedBy = await resolveLogActor(
    hospitalId,
    input.nurseId,
    source
  );

  const hospital = await getHospitalById(hospitalId);
  if (!hospital) throw new Error(`Hospital not found: ${hospitalId}`);

  const entry = await getInventoryEntry(hospitalId, entryId);
  if (!entry) throw new Error(`Inventory entry not found: ${entryId} @ ${hospitalId}`);

  // 1. Apply delta
  const adjustmentType: InventoryAdjustmentType =
    input.adjustmentType ?? "stock";
  const previousCount = entry.count;
  const previousAvailableCount = Math.max(
    entry.availableCount ?? entry.count - entry.inUseCount,
    0
  );
  const newCount =
    adjustmentType === "available"
      ? previousCount
      : Math.max(previousCount + change, 0);
  const newAvailableCount = Math.min(
    Math.max(previousAvailableCount + change, 0),
    newCount
  );
  const newInUseCount = Math.max(newCount - newAvailableCount, 0);
  const newStatus = getInventoryStatus(newAvailableCount, entry.threshold);

  await updateInventoryEntry(hospitalId, entry.id!, {
    count: newCount,
    inUseCount: newInUseCount,
    availableCount: newAvailableCount,
    status: newStatus,
    lastUpdated: now,
  });

  // 2. Log
  await createInventoryLog({
    hospitalId,
    inventoryEntryId: entry.id!,
    previousCount,
    change,
    newCount,
    previousAvailableCount,
    newAvailableCount,
    performedBy,
    source,
    message: input.message,
  });

  // 3. Auto-transfer if shortage (with dedup check)
  let transferCreated = false;
  if (newStatus === "LOW" || newStatus === "CRITICAL_SHORTAGE") {
    const alreadyRequested = await hasActiveRequestForItem(hospitalId, entry.itemId);
    if (!alreadyRequested) {
      const quantityNeeded = Math.max(entry.threshold - newAvailableCount, 1);
      const transferRequest = await autoCreateTransfer(
        hospital,
        entry.itemId,
        quantityNeeded,
        newStatus
      );
      transferCreated = transferRequest !== null;
    }
  }

  return {
    success: true,
    hospitalId,
    entryId: entry.id!,
    itemId: entry.itemId,
    newCount,
    newAvailableCount,
    status: newStatus,
    performedBy,
    transferCreated,
  };
}
