import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebase-config.js";
import type { Log } from "../models/index.js";

export async function logInventoryChange(log: Omit<Log, "id" | "createdAt">) {
  try {
    const logRef = db.collection("inventory_logs").doc();
    await logRef.set({
      ...log,
      createdAt: FieldValue.serverTimestamp(),
    });
    const actor =
      log.performedBy.type === "nurse"
        ? log.performedBy.name
        : log.performedBy.label;
    console.log(
      `[Logger] ${actor} — Hospital ${log.hospitalId}: Entry ${log.inventoryEntryId} (${log.change})`
    );
  } catch (error) {
    console.error("[Logger] Failed to write log to Firestore:", error);
  }
}
