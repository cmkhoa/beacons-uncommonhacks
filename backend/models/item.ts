import type { firestore } from "firebase-admin";

export type ItemCategory =
  | "PPE"
  | "LIFE_SUPPORT"
  | "BLOOD"
  | "MEDICATION"
  | "GENERAL_SUPPLIES";

export interface Item {
  id?: string;
  name: string;
  unit: string;
  category: ItemCategory;
  createdAt?: firestore.Timestamp;
}
