import type { firestore } from "firebase-admin";
import type { LogActor } from "./logActor.js";

export interface Log {
  id?: string;
  hospitalId: string;
  inventoryEntryId: string;
  previousCount: number;
  change: number;
  newCount: number;
  previousAvailableCount: number;
  newAvailableCount: number;
  /** Nurse who made the change, or system for automated transfers/updates. */
  performedBy: LogActor;
  source?: "VOICE_COMMAND" | "MANUAL_FORM" | "DEMO_BUTTON" | "SYSTEM";
  message?: string;
  createdAt: firestore.Timestamp;
}
