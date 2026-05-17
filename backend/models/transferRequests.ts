import type { firestore } from "firebase-admin";

export type InventoryCategory =
  | "PPE"
  | "LIFE_SUPPORT"
  | "BLOOD"
  | "MEDICATION"
  | "GENERAL_SUPPLIES";

export type TransferRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "IN_TRANSIT"
  | "COMPLETED"
  | "CANCELLED";

export type RequestType = "INVENTORY_SHORTAGE";

export type UrgencyLevel = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

/**
 * Direction semantics:
 *   - `fromHospital*` is the REQUESTER (the hospital that needs supplies).
 *   - `toHospital*`   is the DONOR (filled in later by the AI matching agent).
 *
 * A freshly created request has `fromHospital*` populated and `toHospital*`
 * empty until a donor is assigned.
 */
export interface TransferRequest {
  requestId: string;
  requestType: RequestType;
  urgencyLevel: UrgencyLevel;
  itemId?: string;
  itemCategory: InventoryCategory;
  itemName: string;
  quantity: number;
  fromHospitalId: string;
  fromHospitalName: string;
  toHospitalId?: string;
  toHospitalName?: string;
  staffName: string;
  status: TransferRequestStatus;
  distance?: number;
  estimatedTimeMinutes?: number;
  reason: string;
  notes?: string;
  createdAt: firestore.Timestamp;
  updatedAt: firestore.Timestamp;
}
