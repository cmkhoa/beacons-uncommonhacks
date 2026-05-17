import { Router, type Request, type Response } from "express";
import { getAllItems } from "../services/itemService.js";
import type { ItemCategory } from "../models/index.js";

const router = Router();

const ITEM_CATEGORIES: ItemCategory[] = [
  "PPE",
  "LIFE_SUPPORT",
  "BLOOD",
  "MEDICATION",
  "GENERAL_SUPPLIES",
];

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

/**
 * GET /api/items/categories
 * Return the list of supported inventory categories.
 */
router.get("/categories", (_req: Request, res: Response) => {
  res.json({ success: true, categories: ITEM_CATEGORIES });
});

export default router;
