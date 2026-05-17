import { Router, type Request, type Response } from "express";
import {
  getAllHospitals,
  getHospitalById,
  getHospitalWithInventory,
} from "../services/hospitalService.js";
import {
  getInventoryForHospital,
  getInventoryEntry,
  processInventoryUpdate,
} from "../services/inventoryService.js";

const router = Router();

// ── Hospital CRUD ───────────────────────────────────────────────────────

/**
 * GET /api/hospitals
 * List all hospitals. Pass ?hydrate=true to include each hospital's inventory.
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const hydrate = req.query.hydrate === "true";

    if (hydrate) {
      const baseHospitals = await getAllHospitals();
      const hydrated = await Promise.all(
        baseHospitals.map(async (h) => {
          const full = await getHospitalWithInventory(h.id!);
          return full ?? h;
        })
      );
      res.json({ hospitals: hydrated });
    } else {
      const hospitals = await getAllHospitals();
      res.json({ hospitals });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch hospitals" });
  }
});

/**
 * GET /api/hospitals/:hospitalId
 * Fetch a single hospital with its inventory hydrated.
 */
router.get("/:hospitalId", async (req: Request, res: Response) => {
  try {
    const hospital = await getHospitalWithInventory(req.params.hospitalId);
    if (!hospital) {
      res.status(404).json({ error: "Hospital not found" });
      return;
    }
    res.json({ hospital });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch hospital" });
  }
});

// ── Inventory (subcollection of a hospital) ─────────────────────────────

/**
 * GET /api/hospitals/:hospitalId/inventory
 * Fetch all inventory entries for a hospital.
 */
router.get("/:hospitalId/inventory", async (req: Request, res: Response) => {
  try {
    const { hospitalId } = req.params;
    const hospital = await getHospitalById(hospitalId);
    if (!hospital) {
      res.status(404).json({ error: "Hospital not found" });
      return;
    }
    const inventory = await getInventoryForHospital(hospitalId);
    res.json({ inventory });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

/**
 * PATCH /api/hospitals/:hospitalId/inventory/:entryId
 * Update inventory. Accepts either absolute `count` or a `change` delta.
 * Body: { count?, change?, source?, message? }
 */
router.patch("/:hospitalId/inventory/:entryId", async (req: Request, res: Response) => {
  try {
    const { hospitalId, entryId } = req.params;
    const { count, change, source, message } = req.body;

    // Resolve delta: use `change` directly, or compute from absolute `count`
    let delta = change;
    if (delta === undefined && count !== undefined) {
      const entry = await getInventoryEntry(hospitalId, entryId);
      if (!entry) {
        res.status(404).json({ error: "Inventory entry not found" });
        return;
      }
      delta = count - entry.count;
    }

    if (delta === undefined) {
      res.status(400).json({ error: "Either count or change is required" });
      return;
    }

    const result = await processInventoryUpdate({
      hospitalId,
      entryId,
      change: delta,
      source: source || "MANUAL_FORM",
      message: message || "Manual inventory update",
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to update inventory",
    });
  }
});

export default router;
