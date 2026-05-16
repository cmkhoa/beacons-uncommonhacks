import type { firestore } from "firebase-admin";
import type { InventoryEntry } from "./inventoryEntry.js";

export interface ContactInfo {
  phone: string;
  email: string;
  address: string;
  pocName?: string;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface Hospital {
  id?: string;
  name: string;
  contactInfo: ContactInfo;
  location: Location;
  totalBeds: number;
  status?: "NORMAL" | "HAS_SHORTAGE";
  inventory?: InventoryEntry[];
  createdAt: firestore.Timestamp;
  updatedAt: firestore.Timestamp;
}
