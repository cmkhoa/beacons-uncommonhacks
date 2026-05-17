import { Router, type Request, type Response } from "express";
import {
  processInventoryUpdate,
  getInventoryEntry,
  getInventoryForHospital,
} from "../services/inventoryService.js";
import { getAllItems, getItemById } from "../services/itemService.js";
const router = Router();

// Simple shared secret check
const WEBHOOK_SECRET = process.env.VOICE_WEBHOOK_SECRET || "beacon-fallback-secret";

/**
 * Middleware to verify ElevenLabs webhook secret
 */
const verifySecret = (req: Request, res: Response, next: Function) => {
  const secret = req.headers["x-beacon-secret"];
  if (secret !== WEBHOOK_SECRET) {
    console.warn(`[Voice] Unauthorized tool call attempt from IP: ${req.ip}`);
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function normalizeItemName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(respirator|respirators|mask|masks|dose|doses|unit|units)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function parseQuantityList(value: unknown): number[] {
  if (Array.isArray(value)) return value.map(Number).filter((n) => Number.isFinite(n));
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isFinite(n));
  }
  if (typeof value === "number" && Number.isFinite(value)) return [value];
  return [];
}

function normalizeInventoryAction(value: unknown): "used" | "removed" | "added" | null {
  if (typeof value !== "string") return null;
  const action = value.trim().toLowerCase();
  if (action === "used" || action === "removed" || action === "added") {
    return action;
  }
  return null;
}

function actionToUpdate(action: "used" | "removed" | "added", quantity: number) {
  const amount = Math.abs(quantity);
  if (action === "added") {
    return { change: amount, adjustmentType: "stock" as const };
  }
  if (action === "used") {
    return { change: -amount, adjustmentType: "available" as const };
  }
  return { change: -amount, adjustmentType: "stock" as const };
}

async function resolveEntryIdByItemName(
  hospitalId: string,
  itemName: string
): Promise<string | null> {
  const [inventory, items] = await Promise.all([
    getInventoryForHospital(hospitalId),
    getAllItems(),
  ]);

  const target = normalizeItemName(itemName);
  const item = items.find((candidate) => {
    const candidateName = normalizeItemName(candidate.name);
    return (
      candidateName === target ||
      candidateName.includes(target) ||
      target.includes(candidateName)
    );
  });

  if (!item?.id) return null;
  return inventory.find((entry) => entry.itemId === item.id)?.id ?? null;
}

async function updateSingleInventoryItem(
  params: Record<string, unknown>
): Promise<string> {
  const hospitalId = firstString(params.hospitalId);
  const nurseId = firstString(params.nurseId);
  let entryId = firstString(params.entryId, params.entry_id);
  const itemName = firstString(params.itemName, params.item_name, params.item);
  const rawChange = params.change ?? params.quantity ?? params.item_quantity;
  const change = Number(rawChange);
  const adjustmentType =
    params.adjustmentType === "available" ? "available" : "stock";

  if (!hospitalId) throw new Error("hospitalId is required");
  if (!Number.isFinite(change)) throw new Error("change is required");

  if (!entryId && itemName) {
    entryId = (await resolveEntryIdByItemName(hospitalId, itemName)) ?? undefined;
  }
  if (!entryId) throw new Error(`Could not resolve inventory item: ${itemName ?? "unknown"}`);

  const result = await processInventoryUpdate({
    hospitalId,
    entryId,
    change,
    adjustmentType,
    nurseId,
    source: nurseId ? "VOICE_COMMAND" : "SYSTEM",
    message: `Voice update: ${change > 0 ? "Added" : "Removed"} ${Math.abs(change)} items.`,
  });

  const item = await getItemById(result.itemId);
  const itemLabel = item ? item.name : "the item";
  return `Updated ${itemLabel}. New available count is ${result.newAvailableCount}.`;
}

async function handleInventoryUpdate(params: Record<string, unknown>): Promise<string> {
  if (params.reported_items || params.items || params.item_names) {
    const hospitalId = firstString(params.hospitalId);
    const nurseId = firstString(params.nurseId);
    const items = parseList(params.reported_items ?? params.items ?? params.item_names);
    const quantities = parseQuantityList(
      params.item_quantities ?? params.quantities ?? params.quantity
    );

    if (!hospitalId) throw new Error("hospitalId is required");
    if (items.length === 0) throw new Error("reported_items is required");
    if (quantities.length !== items.length) {
      throw new Error("item_quantities must match reported_items");
    }

    const updates = await Promise.all(
      items.map((itemName, index) =>
        updateSingleInventoryItem({
          hospitalId,
          nurseId,
          itemName,
          change: -Math.abs(quantities[index]),
          adjustmentType: "available",
        })
      )
    );

    return updates.join(" ");
  }

  return updateSingleInventoryItem(params);
}

async function handleInventoryAction(params: Record<string, unknown>): Promise<string> {
  const action = normalizeInventoryAction(params.action);
  const quantity = Number(params.quantity ?? params.item_quantity);

  if (!action) throw new Error('action must be "used", "removed", or "added"');
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("quantity must be a positive number");
  }

  const { change, adjustmentType } = actionToUpdate(action, quantity);

  return updateSingleInventoryItem({
    ...params,
    change,
    adjustmentType,
  });
}

async function handleInventoryGet(params: Record<string, unknown>): Promise<string> {
  const hospitalId = firstString(params.hospitalId);
  let entryId = firstString(params.entryId, params.entry_id);
  const itemName = firstString(params.itemName, params.item_name, params.item);

  if (!hospitalId) throw new Error("hospitalId is required");
  if (!entryId && itemName) {
    entryId = (await resolveEntryIdByItemName(hospitalId, itemName)) ?? undefined;
  }
  if (!entryId) throw new Error(`Could not resolve inventory item: ${itemName ?? "unknown"}`);

  const entry = await getInventoryEntry(hospitalId, entryId);

  if (!entry) {
    return "I couldn't find that item in the records for this facility.";
  }

  const itemDetails = await getItemById(entry.itemId);
  const resolvedItemName = itemDetails ? itemDetails.name : "the item";
  const itemUnit = itemDetails ? itemDetails.unit : "units";

  return `You currently have ${entry.count} ${itemUnit} of ${resolvedItemName}. ${entry.availableCount} are available for use and the status is ${entry.status.toLowerCase().replace("_", " ")}.`;
}

/**
 * POST /api/voice/webhooks/update
 * Handles ElevenLabs inventory update tool calls.
 */
router.post("/webhooks/update", verifySecret, async (req: Request, res: Response) => {
  try {
    const params = (req.body.parameters ?? req.body) as Record<string, unknown>;
    console.log("[Voice] Update webhook called", params);
    res.json({ result: await handleInventoryUpdate(params) });
  } catch (error: any) {
    console.error("[Voice Update Webhook Error]", error);
    res.status(200).json({ result: `Sorry, I encountered an error: ${error.message}` });
  }
});

/**
 * POST /api/voice/webhooks/action
 * Handles explicit used/removed/added inventory actions.
 */
router.post("/webhooks/action", verifySecret, async (req: Request, res: Response) => {
  try {
    const params = (req.body.parameters ?? req.body) as Record<string, unknown>;
    console.log("[Voice] Action webhook called", params);
    res.json({ result: await handleInventoryAction(params) });
  } catch (error: any) {
    console.error("[Voice Action Webhook Error]", error);
    res.status(200).json({ result: `Sorry, I encountered an error: ${error.message}` });
  }
});

/**
 * POST /api/voice/webhooks/get
 * Handles ElevenLabs inventory lookup tool calls.
 */
router.post("/webhooks/get", verifySecret, async (req: Request, res: Response) => {
  try {
    const params = (req.body.parameters ?? req.body) as Record<string, unknown>;
    console.log("[Voice] Get webhook called", params);
    res.json({ result: await handleInventoryGet(params) });
  } catch (error: any) {
    console.error("[Voice Get Webhook Error]", error);
    res.status(200).json({ result: `Sorry, I encountered an error: ${error.message}` });
  }
});

export default router;
