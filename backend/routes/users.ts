import { Router, type Request, type Response } from "express";
import { getHospitalById } from "../services/hospitalService.js";
import {
  createUser,
  getUserById,
  getUsersByHospital,
} from "../services/userService.js";

const router = Router();

/**
 * GET /api/users?hospitalId=...
 * List nurses registered to a hospital.
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { hospitalId } = req.query;
    if (typeof hospitalId !== "string" || !hospitalId) {
      res.status(400).json({ error: "hospitalId query parameter is required" });
      return;
    }

    const hospital = await getHospitalById(hospitalId);
    if (!hospital) {
      res.status(404).json({ error: "Hospital not found" });
      return;
    }

    const users = await getUsersByHospital(hospitalId);
    res.json({ users });
  } catch {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/**
 * GET /api/users/:userId
 */
router.get("/:userId", async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.params.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user });
  } catch {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

/**
 * POST /api/users
 * Body: { name, hospitalId }
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, hospitalId } = req.body;
    if (!name || !hospitalId) {
      res.status(400).json({ error: "name and hospitalId are required" });
      return;
    }

    const id = await createUser({
      name,
      role: "NURSE",
      hospitalId,
    });
    const user = await getUserById(id);
    res.status(201).json({ user });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to create user",
    });
  }
});

export default router;
