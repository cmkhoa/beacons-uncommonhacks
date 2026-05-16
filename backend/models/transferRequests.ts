import type { firestore } from "firebase-admin";

export type TransferRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "IN_TRANSIT"
  | "COMPLETED"
  | "CANCELLED";

export interface TransferRequest {
  requestId: string;
  itemId: string;
  quantity: number;
  fromHospitalId: string;
  toHospitalId: string;
  status: TransferRequestStatus;
  distance?: number;
  estimatedTimeMinutes?: number;
  reason: string;
  createdAt: firestore.Timestamp;
  updatedAt: firestore.Timestamp;
}
