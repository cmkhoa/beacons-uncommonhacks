import type { firestore } from "firebase-admin";

export interface Log {
  id?: string;
  hospitalId: string;
  inventoryEntryId: string;
  previousCount: number;
  change: number;
  newCount: number;
  previousAvailableCount: number;
  newAvailableCount: number;
  source?: "VOICE_COMMAND" | "MANUAL_FORM" | "DEMO_BUTTON" | "SYSTEM";
  message?: string;
  createdAt: firestore.Timestamp;
}
