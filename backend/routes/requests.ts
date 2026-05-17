import { Router, type Request, type Response } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebase-config.js";
import {
  getActiveTransferRequests,
  getTransferRequestById,
  updateTransferRequest,
} from "../services/transferService.js";
import type { TransferRequest } from "../models/index.js";

const router = Router();

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
 * Create a manual supply request.
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { toHospitalId, itemId, quantity, reason } = req.body;

    if (!toHospitalId || !itemId || quantity === undefined) {
      res
        .status(400)
        .json({ error: "toHospitalId, itemId, and quantity are required" });
      return;
    }

    const toHospitalDoc = await db.collection("hospitals").doc(toHospitalId).get();
    if (!toHospitalDoc.exists) {
      res.status(404).json({ error: "Destination hospital not found" });
      return;
    }

    const requestData: Omit<TransferRequest, "requestId"> = {
      itemId,
      quantity,
      toHospitalId,
      fromHospitalId: "SYSTEM_RESERVE",
      status: "PENDING",
      reason,
      createdAt: FieldValue.serverTimestamp() as any,
      updatedAt: FieldValue.serverTimestamp() as any,
    };

    const docRef = await db.collection("transfer_requests").add(requestData);

    res.json({ success: true, requestId: docRef.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create request" });
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
 * Mark a transfer request as completed.
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

    const updatedRequest = await updateTransferRequest(requestId, {
      status: "COMPLETED",
      updatedAt: FieldValue.serverTimestamp() as any,
    });

    res.json({
      success: true,
      message: "Transfer request completed",
      request: updatedRequest,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to complete transfer request" });
  }
});

export default router;
