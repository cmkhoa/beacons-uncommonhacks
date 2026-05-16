import type { firestore } from "firebase-admin";

export interface Item {
  id?: string;
  name: string;
  unit: string;
  category: string;
  createdAt?: firestore.Timestamp;
}
