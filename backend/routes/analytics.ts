import { Router, type Request, type Response } from "express";
import { getAllHospitals } from "../services/hospitalService.js";
import { getAllInventoryEntries } from "../services/inventoryService.js";
import { getAllItems } from "../services/itemService.js";

const router = Router();

/** GET /api/analytics/summary — regional snapshot from Firestore */
router.get("/summary", async (_req: Request, res: Response) => {
  try {
    const [hospitals, entries, itemsList] = await Promise.all([
      getAllHospitals(),
      getAllInventoryEntries(),
      getAllItems(),
    ]);

    const itemMap = new Map(itemsList.map(item => [item.id, item]));

    const criticalShortages = entries.filter(
      (e) => e.status === "CRITICAL_SHORTAGE"
    ).length;
    const surplusEntries = entries.filter((e) => e.status === "SURPLUS").length;
    const hospitalsWithCritical = new Set(
      entries
        .filter((e) => e.status === "CRITICAL_SHORTAGE")
        .map((e) => e.hospitalId)
    ).size;

    const byCategory = entries.reduce<Record<string, number>>(
      (acc, entry) => {
        const item = itemMap.get(entry.itemId);
        if (item) {
          acc[item.category] = (acc[item.category] ?? 0) + 1;
        } else {
          acc["Uncategorized"] = (acc["Uncategorized"] ?? 0) + 1;
        }
        return acc;
      },
      {}
    );

    res.status(200).json({
      region: "chicago_metro",
      hospitalCount: hospitals.length,
      inventoryEntryCount: entries.length,
      criticalShortages,
      surplusEntries,
      hospitalsWithCritical,
      byCategory,
      entries: entries.map((e) => ({
        hospitalId: e.hospitalId,
        id: e.id,
        itemId: e.itemId,
        count: e.count,
        threshold: e.threshold,
        status: e.status,
      })),
    });
  } catch (error) {
    console.error("[GET /api/analytics/summary] error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
