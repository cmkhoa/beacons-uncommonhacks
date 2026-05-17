import type { firestore } from "firebase-admin";

/** Roles for RBAC; extend as new roles are added. */
export type UserRole = "NURSE";

/**
 * A nurse registered to a single hospital.
 * Stored in the top-level `users` collection.
 */
export interface User {
  id?: string;
  name: string;
  role: UserRole;
  hospitalId: string;
  createdAt?: firestore.Timestamp;
  updatedAt?: firestore.Timestamp;
}
