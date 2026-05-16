import { Timestamp } from "firebase-admin/firestore";
import type { Hospital, InventoryEntry, TransferRequest } from "../models/index.js";
import { calculateDistance } from "../utils/distance.js";
import { getAllHospitals } from "./hospitalService.js";
import {
  createTransferRequest,
  getInventoryEntriesByItemId,
} from "./inventoryService.js";

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
 * When an inventory entry drops to LOW or CRITICAL_SHORTAGE,
 * find a surplus donor and create a transfer request automatically.
 *
 * Returns the created TransferRequest, or null if no donor was found.
 */
export async function autoCreateTransfer(
  hospital: Hospital,
  itemId: string,
  quantityNeeded: number,
  status: string
): Promise<TransferRequest | null> {
  const [allHospitals, peerInventory] = await Promise.all([
    getAllHospitals(),
    getInventoryEntriesByItemId(itemId),
  ]);

  const match = findClosestDonor(hospital, allHospitals, peerInventory, itemId);

  if (!match.donorHospital || !match.donorEntry) return null;

  const now = Timestamp.now();
  const trData: Omit<TransferRequest, "requestId"> = {
    itemId,
    quantity: quantityNeeded,
    fromHospitalId: match.donorHospital.id!,
    toHospitalId: hospital.id!,
    status: "PENDING",
    distance: match.distance ?? undefined,
    reason: `Auto-generated: item ${itemId} is ${status} at hospital ${hospital.id}`,
    createdAt: now,
    updatedAt: now,
  };

  const requestId = await createTransferRequest(trData);
  return { requestId, ...trData };
}
