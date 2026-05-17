import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase-config.js";
import type {
  Hospital,
  InventoryEntry,
  TransferRequest,
} from "../models/index.js";
import type { InventoryStatus } from "../models/inventoryEntry.js";
import type { UrgencyLevel } from "../models/transferRequests.js";
import { calculateDistance } from "../utils/distance.js";
import { getAllHospitals } from "./hospitalService.js";
import {
  createTransferRequest,
  getInventoryEntriesByItemId,
  getInventoryForHospital,
} from "./inventoryService.js";
import { getItemById } from "./itemService.js";

const TRANSFER_REQUESTS = "transfer_requests";

// ── Donor matching (pure) ───────────────────────────────────────────────

export interface DonorMatch {
  donorHospital: Hospital | null;
  donorEntry: InventoryEntry | null;
  distance: number | null;
}

const NO_MATCH: DonorMatch = {
  donorHospital: null,
  donorEntry: null,
  distance: null,
};

/**
 * Find the closest hospital that can donate `itemId` to `targetHospital`.
 *
 * A valid donor:
 *   - Is not the target hospital itself.
 *   - Has an inventory entry whose `itemId` matches.
 *   - Is flagged as `SURPLUS`.
 *   - Has real headroom: availableCount > threshold.
 *
 * Inputs are assumed to be pre-fetched (no Firebase access here).
 */
export function findClosestDonor(
  targetHospital: Hospital,
  allHospitals: Hospital[],
  inventoryEntries: InventoryEntry[],
  itemId: string
): DonorMatch {
  const candidates = inventoryEntries.filter((entry) => {
    if (entry.itemId !== itemId) return false;
    if (entry.status !== "SURPLUS") return false;
    if (entry.hospitalId === targetHospital.id) return false;
    return entry.availableCount > entry.threshold;
  });

  if (candidates.length === 0) return NO_MATCH;

  const hospitalsById = new Map<string, Hospital>();
  for (const h of allHospitals) {
    if (h.id) hospitalsById.set(h.id, h);
  }

  let best: DonorMatch = NO_MATCH;
  let shortest = Infinity;

  for (const entry of candidates) {
    const donor = hospitalsById.get(entry.hospitalId);
    if (!donor) continue;

    const distance = calculateDistance(targetHospital, donor);
    if (distance < shortest) {
      shortest = distance;
      best = { donorHospital: donor, donorEntry: entry, distance };
    }
  }

  return best;
}

// ── Auto-transfer orchestration ─────────────────────────────────────────

/**
 * When an inventory entry drops to LOW or CRITICAL_SHORTAGE, run the
 * distance-based matcher to pick the closest surplus donor and create a
 * transfer request automatically.
 *
 * Direction semantics (matches `models/transferRequests.ts`):
 *   - `fromHospital*` = the hospital experiencing the shortage (requester)
 *   - `toHospital*`   = the matched donor hospital (closest by distance)
 *
 * Returns the created TransferRequest. If no donor is found, the request
 * is still created with empty `toHospital*` so dispatch (or the AI agent
 * later) can assign one manually.
 */
// Auto-generated transfers don't originate from a real staff member.
const SYSTEM_STAFF_NAME = "System (auto-generated)";

function urgencyFromStatus(status: InventoryStatus): UrgencyLevel {
  switch (status) {
    case "CRITICAL_SHORTAGE":
      return "CRITICAL";
    case "LOW":
      return "HIGH";
    default:
      return "NORMAL";
  }
}

export async function autoCreateTransfer(
  hospital: Hospital,
  itemId: string,
  quantityNeeded: number,
  status: InventoryStatus
): Promise<TransferRequest | null> {
  const [allHospitals, peerInventory, item] = await Promise.all([
    getAllHospitals(),
    getInventoryEntriesByItemId(itemId),
    getItemById(itemId),
  ]);

  if (!item) return null;

  const match = findClosestDonor(hospital, allHospitals, peerInventory, itemId);

  const now = Timestamp.now();
  const trData: Omit<TransferRequest, "requestId"> = {
    requestType: "INVENTORY_SHORTAGE",
    urgencyLevel: urgencyFromStatus(status),
    itemId,
    itemCategory: item.category,
    itemName: item.name,
    quantity: quantityNeeded,
    fromHospitalId: hospital.id!,
    fromHospitalName: hospital.name,
    staffName: SYSTEM_STAFF_NAME,
    status: "PENDING",
    reason: `Auto-generated: ${item.name} is ${status} at ${hospital.name}`,
    createdAt: now,
    updatedAt: now,
  };

  if (match.donorHospital) {
    trData.toHospitalId = match.donorHospital.id!;
    trData.toHospitalName = match.donorHospital.name;
  }
  if (match.distance !== null && Number.isFinite(match.distance)) {
    trData.distance = match.distance;
  }

  const requestId = await createTransferRequest(trData);
  return { requestId, ...trData };
}

// ── Transfer request queries / mutations ────────────────────────────────

/**
 * Fetch all transfer requests that are still active
 * (status not COMPLETED and not CANCELLED).
 */
export async function getActiveTransferRequests(): Promise<TransferRequest[]> {
  const snap = await db
    .collection(TRANSFER_REQUESTS)
    .where("status", "not-in", ["COMPLETED", "CANCELLED"])
    .get();

  return snap.docs.map((d) => ({
    requestId: d.id,
    ...(d.data() as Omit<TransferRequest, "requestId">),
  }));
}

/**
 * Fetch a single transfer request by its document ID.
 * Returns null if it does not exist.
 */
export async function getTransferRequestById(
  requestId: string
): Promise<TransferRequest | null> {
  const doc = await db.collection(TRANSFER_REQUESTS).doc(requestId).get();
  if (!doc.exists) return null;
  return {
    requestId: doc.id,
    ...(doc.data() as Omit<TransferRequest, "requestId">),
  };
}

/**
 * Update a transfer request and return the latest version.
 */
export async function updateTransferRequest(
  requestId: string,
  updateData: Partial<Omit<TransferRequest, "requestId">>
): Promise<TransferRequest | null> {
  await db.collection(TRANSFER_REQUESTS).doc(requestId).update(updateData);
  return getTransferRequestById(requestId);
}

// ── Deduplication ───────────────────────────────────────────────────────

/**
 * Check whether an active (non-COMPLETED, non-CANCELLED) transfer request
 * already exists for a given hospital + item pair.
 *
 * Uses the existing getActiveTransferRequests() query (single-field filter)
 * and filters in memory to avoid requiring a Firestore composite index.
 */
export async function hasActiveRequestForItem(
  hospitalId: string,
  itemId: string
): Promise<boolean> {
  const active = await getActiveTransferRequests();
  return active.some(
    (r) => r.fromHospitalId === hospitalId && r.itemId === itemId
  );
}

// ── Startup shortage scan ───────────────────────────────────────────────

/**
 * Scan all hospitals for inventory entries that are currently LOW or
 * CRITICAL_SHORTAGE and create transfer requests for any that don't
 * already have an active request. Intended to run once on server boot.
 */
export async function scanAndCreateShortageRequests(): Promise<number> {
  const allHospitals = await getAllHospitals();
  let created = 0;

  for (const hospital of allHospitals) {
    if (!hospital.id) continue;

    const inventory = await getInventoryForHospital(hospital.id);

    for (const entry of inventory) {
      if (entry.status !== "LOW" && entry.status !== "CRITICAL_SHORTAGE") {
        continue;
      }

      const alreadyRequested = await hasActiveRequestForItem(
        hospital.id,
        entry.itemId
      );
      if (alreadyRequested) continue;

      const quantityNeeded = Math.max(entry.threshold - entry.availableCount, 1);
      const result = await autoCreateTransfer(
        hospital,
        entry.itemId,
        quantityNeeded,
        entry.status
      );
      if (result) {
        console.log(
          `[Scan] Created request: ${result.itemName} for ${hospital.name}`
        );
        created++;
      }
    }
  }

  return created;
}
