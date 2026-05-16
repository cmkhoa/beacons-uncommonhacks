import { db } from "../config/firebase-config.js";
import type { Hospital, InventoryEntry } from "../models/index.js";

const HOSPITALS = "hospitals";
const INVENTORY_SUB = "inventory";

export async function getHospitalById(
  id: string
): Promise<Hospital | null> {
  const doc = await db.collection(HOSPITALS).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Omit<Hospital, "id">) };
}

export async function getAllHospitals(): Promise<Hospital[]> {
  const snap = await db.collection(HOSPITALS).get();
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Hospital, "id">),
  }));
}

/**
 * Fetch a hospital together with its inventory subcollection.
 */
export async function getHospitalWithInventory(
  hospitalId: string
): Promise<Hospital | null> {
  const hospital = await getHospitalById(hospitalId);
  if (!hospital) return null;

  // Inline inventory fetch to avoid circular import with inventoryService
  const snap = await db
    .collection(HOSPITALS)
    .doc(hospitalId)
    .collection(INVENTORY_SUB)
    .get();
  hospital.inventory = snap.docs.map((d) => ({
    id: d.id,
    hospitalId,
    ...(d.data() as Omit<InventoryEntry, "id" | "hospitalId">),
  }));

  return hospital;
}
