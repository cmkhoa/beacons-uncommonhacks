import { Router, type Request, type Response } from "express";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  getActiveTransferRequests,
  getTransferRequestById,
  updateTransferRequest,
  findClosestDonor,
} from "../services/transferService.js";
import { getHospitalById, getAllHospitals } from "../services/hospitalService.js";
import {
  createTransferRequest,
  getInventoryEntriesByItemId,
  getInventoryEntryByItemId,
  updateInventoryEntry,
  createInventoryLog,
} from "../services/inventoryService.js";
import { getItemById } from "../services/itemService.js";
import { getInventoryStatus } from "../utils/status.js";
import { SYSTEM_LOG_ACTOR } from "../models/logActor.js";
import { db } from "../config/firebase-config.js";
import type { TransferRequest } from "../models/index.js";
import type { InventoryCategory } from "../models/transferRequests.js";

const router = Router();

const VALID_CATEGORIES: InventoryCategory[] = [
  "PPE",
  "LIFE_SUPPORT",
  "BLOOD",
  "MEDICATION",
  "GENERAL_SUPPLIES",
];

/**
 * GET /api/requests
 * List all active transfer requests (not COMPLETED, not CANCELLED).
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const requests = await getActiveTransferRequests();
    res.json({ success: true, requests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch transfer requests" });
  }
});

/**
 * POST /api/requests
 * Create a supply request on behalf of a requesting hospital.
 *
 * `fromHospitalId` is the requester (the hospital that needs supplies).
 * `toHospitalId` (the donor) is left empty here and filled in later by
 * the AI matching agent via `POST /:requestId/assign-donor`.
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { fromHospitalId, itemId, itemName, itemCategory, quantity, reason, staffName } =
      req.body ?? {};

    if (!fromHospitalId || quantity === undefined) {
      res.status(400).json({
        error: "fromHospitalId and quantity are required",
      });
      return;
    }

    if (
      typeof quantity !== "number" ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      res.status(400).json({ error: "quantity must be a positive number" });
      return;
    }

    const fromHospital = await getHospitalById(fromHospitalId);
    if (!fromHospital) {
      res.status(404).json({ error: "Requesting hospital not found" });
      return;
    }

    let resolvedItemId: string | undefined;
    let resolvedItemName: string;
    let resolvedCategory: InventoryCategory;

    if (itemId) {
      const item = await getItemById(itemId);
      if (!item) {
        res.status(404).json({ error: "Item not found" });
        return;
      }
      resolvedItemId = item.id;
      resolvedItemName = item.name;
      resolvedCategory = item.category;
    } else if (
      typeof itemName === "string" &&
      itemName.trim() &&
      itemCategory &&
      VALID_CATEGORIES.includes(itemCategory)
    ) {
      resolvedItemName = itemName.trim();
      resolvedCategory = itemCategory;
    } else {
      res.status(400).json({
        error: "Provide itemId or both itemName and itemCategory",
      });
      return;
    }

    const now = Timestamp.now();
    const requestData: Omit<TransferRequest, "requestId"> & { distance?: number } = {
      requestType: "INVENTORY_SHORTAGE",
      urgencyLevel: "NORMAL",
      itemId: resolvedItemId,
      itemCategory: resolvedCategory,
      itemName: resolvedItemName,
      quantity,
      fromHospitalId: fromHospital.id!,
      fromHospitalName: fromHospital.name,
      staffName: staffName ?? "Unknown staff",
      status: "PENDING",
      reason: reason ?? `Supply request for ${resolvedItemName}`,
      createdAt: now,
      updatedAt: now,
    };

    let donorAssigned = false;

    // Synchronous Auto-Match Logic
    if (resolvedItemId) {
      const allHospitals = await getAllHospitals();
      const peerInventory = await getInventoryEntriesByItemId(resolvedItemId);
      const match = findClosestDonor(fromHospital, allHospitals, peerInventory, resolvedItemId);

      if (match.donorHospital) {
        requestData.toHospitalId = match.donorHospital.id!;
        requestData.toHospitalName = match.donorHospital.name;
        if (match.distance !== null && Number.isFinite(match.distance)) {
          requestData.distance = match.distance;
        }
        donorAssigned = true;
      }
    }

    const requestId = await createTransferRequest(requestData);
    const createdRequest: TransferRequest = { requestId, ...requestData };

    res.json({
      success: true,
      donorAssigned,
      message: donorAssigned 
        ? `Request created and automatically matched with donor: ${requestData.toHospitalName}.`
        : "Request created. Awaiting donor hospital assignment.",
      request: createdRequest,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create request" });
  }
});

/**
 * POST /api/requests/:requestId/assign-donor
 * Assign a donor hospital to a request. Intended to be called by the AI
 * matching agent once it picks the best peer hospital. Stub for now —
 * the agent will be implemented later.
 */
router.post("/:requestId/assign-donor", async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { toHospitalId } = req.body ?? {};

    if (!requestId) {
      res.status(400).json({ error: "requestId is required" });
      return;
    }
    if (!toHospitalId) {
      res.status(400).json({ error: "toHospitalId is required" });
      return;
    }

    const existing = await getTransferRequestById(requestId);
    if (!existing) {
      res.status(404).json({ error: "Transfer request not found" });
      return;
    }
    if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
      res.status(400).json({
        error: `Cannot assign donor to a ${existing.status} request`,
      });
      return;
    }

    const donor = await getHospitalById(toHospitalId);
    if (!donor) {
      res.status(404).json({ error: "Donor hospital not found" });
      return;
    }
    if (donor.id === existing.fromHospitalId) {
      res
        .status(400)
        .json({ error: "Donor hospital cannot be the requesting hospital" });
      return;
    }

    const updatedRequest = await updateTransferRequest(requestId, {
      toHospitalId: donor.id!,
      toHospitalName: donor.name,
      updatedAt: FieldValue.serverTimestamp() as any,
    });

    res.json({
      success: true,
      message: "Donor assigned",
      request: updatedRequest,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to assign donor" });
  }
});

/**
 * POST /api/requests/:requestId/approve
 * Approve a pending transfer request.
 */
router.post("/:requestId/approve", async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    if (!requestId) {
      res.status(400).json({ error: "requestId is required" });
      return;
    }

    const existing = await getTransferRequestById(requestId);
    if (!existing) {
      res.status(404).json({ error: "Transfer request not found" });
      return;
    }

    if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
      res
        .status(400)
        .json({ error: `Cannot approve a ${existing.status} request` });
      return;
    }

    const updatedRequest = await updateTransferRequest(requestId, {
      status: "APPROVED",
      updatedAt: FieldValue.serverTimestamp() as any,
    });

    res.json({
      success: true,
      message: "Transfer request approved",
      request: updatedRequest,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to approve transfer request" });
  }
});

/**
 * POST /api/requests/:requestId/complete
 * Mark a transfer request as completed and reconcile inventory:
 *   - Deduct `quantity` from the Donor hospital's inventory.
 *   - Add `quantity` to the Requester hospital's inventory
 *     (auto-creates an inventory entry if the requester doesn't have one).
 *   - Recalculate inventory status on both sides.
 *   - Log both changes.
 */
router.post("/:requestId/complete", async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    if (!requestId) {
      res.status(400).json({ error: "requestId is required" });
      return;
    }

    const existing = await getTransferRequestById(requestId);
    if (!existing) {
      res.status(404).json({ error: "Transfer request not found" });
      return;
    }

    if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
      res
        .status(400)
        .json({ error: `Cannot complete a ${existing.status} request` });
      return;
    }

    const inventoryResult = { donorDeducted: false, requesterAdded: false };

    // ── Inventory reconciliation (only for catalog items with a donor) ──
    if (existing.itemId && existing.toHospitalId) {
      const { itemId, quantity, toHospitalId, fromHospitalId } = existing;
      const now = Timestamp.now();

      // ── 1. Deduct from Donor ──────────────────────────────────────────
      const donorEntry = await getInventoryEntryByItemId(toHospitalId, itemId);
      if (donorEntry && donorEntry.id) {
        const prevCount = donorEntry.count;
        const newCount = Math.max(prevCount - quantity, 0);
        const prevAvailable = Math.max(donorEntry.count - donorEntry.inUseCount, 0);
        const newAvailable = Math.max(newCount - donorEntry.inUseCount, 0);
        const newStatus = getInventoryStatus(newAvailable, donorEntry.threshold);

        await updateInventoryEntry(toHospitalId, donorEntry.id, {
          count: newCount,
          availableCount: newAvailable,
          status: newStatus,
          lastUpdated: now,
        });

        await createInventoryLog({
          hospitalId: toHospitalId,
          inventoryEntryId: donorEntry.id,
          previousCount: prevCount,
          change: -quantity,
          newCount,
          previousAvailableCount: prevAvailable,
          newAvailableCount: newAvailable,
          performedBy: SYSTEM_LOG_ACTOR,
          source: "SYSTEM",
          message: `Transfer completed: sent ${quantity} units to ${existing.fromHospitalName}`,
        });

        inventoryResult.donorDeducted = true;
      }

      // ── 2. Add to Requester ────────────────────────────────────────────
      let requesterEntry = await getInventoryEntryByItemId(fromHospitalId, itemId);

      if (!requesterEntry) {
        // Auto-create an inventory entry for the requester
        const item = await getItemById(itemId);
        const defaultThreshold = 10;
        const newEntryRef = await db
          .collection("hospitals")
          .doc(fromHospitalId)
          .collection("inventory")
          .add({
            itemId,
            count: 0,
            inUseCount: 0,
            availableCount: 0,
            threshold: defaultThreshold,
            status: "CRITICAL_SHORTAGE" as const,
            createdAt: now,
            lastUpdated: now,
          });
        requesterEntry = {
          id: newEntryRef.id,
          hospitalId: fromHospitalId,
          itemId,
          count: 0,
          inUseCount: 0,
          availableCount: 0,
          threshold: defaultThreshold,
          status: "CRITICAL_SHORTAGE",
          createdAt: now,
          lastUpdated: now,
        };
      }

      if (requesterEntry.id) {
        const prevCount = requesterEntry.count;
        const newCount = prevCount + quantity;
        const prevAvailable = Math.max(requesterEntry.count - requesterEntry.inUseCount, 0);
        const newAvailable = Math.max(newCount - requesterEntry.inUseCount, 0);
        const newStatus = getInventoryStatus(newAvailable, requesterEntry.threshold);

        await updateInventoryEntry(fromHospitalId, requesterEntry.id, {
          count: newCount,
          availableCount: newAvailable,
          status: newStatus,
          lastUpdated: now,
        });

        await createInventoryLog({
          hospitalId: fromHospitalId,
          inventoryEntryId: requesterEntry.id,
          previousCount: prevCount,
          change: quantity,
          newCount,
          previousAvailableCount: prevAvailable,
          newAvailableCount: newAvailable,
          performedBy: SYSTEM_LOG_ACTOR,
          source: "SYSTEM",
          message: `Transfer completed: received ${quantity} units from ${existing.toHospitalName}`,
        });

        inventoryResult.requesterAdded = true;
      }
    }

    // ── 3. Mark completed ───────────────────────────────────────────────
    const updatedRequest = await updateTransferRequest(requestId, {
      status: "COMPLETED",
      updatedAt: FieldValue.serverTimestamp() as any,
    });

    res.json({
      success: true,
      message: "Transfer request completed",
      request: updatedRequest,
      inventoryUpdated: inventoryResult,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to complete transfer request" });
  }
});

export default router;
