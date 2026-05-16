import type { firestore } from "firebase-admin";

export type InventoryStatus =
  | "CRITICAL_SHORTAGE"
  | "LOW"
  | "ADEQUATE"
  | "SURPLUS";

/**
 * A single inventory entry living in the subcollection
 * `hospitals/{hospitalId}/inventory/{entryId}`.
 *
 * The parent hospital is implicit from the Firestore path,
 * but we carry `hospitalId` as a convenience field for
 * collectionGroup queries and serialized API responses.
 */
export interface InventoryEntry {
  id?: string;
  hospitalId: string;
  itemId: string;
  count: number;
  inUseCount: number;
  availableCount: number;
  threshold: number;
  status: InventoryStatus;
  createdAt: firestore.Timestamp;
  lastUpdated: firestore.Timestamp;
}
