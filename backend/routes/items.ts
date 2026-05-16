import { Router, type Request, type Response } from "express";
import { getAllItems } from "../services/itemService.js";

const router = Router();

/**
 * GET /api/items
 * Fetch the global items catalog.
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const items = await getAllItems();
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

export default router;
