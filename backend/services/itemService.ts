import { db } from "../config/firebase-config.js";
import type { Item } from "../models/index.js";

const ITEMS = "items";

export async function createItem(data: Omit<Item, "id">): Promise<string> {
  const ref = await db.collection(ITEMS).add(data);
  return ref.id;
}

export async function getItemById(itemId: string): Promise<Item | null> {
  const doc = await db.collection(ITEMS).doc(itemId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Omit<Item, "id">) };
}

export async function getAllItems(): Promise<Item[]> {
  const snap = await db.collection(ITEMS).get();
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Item, "id">),
  }));
}
