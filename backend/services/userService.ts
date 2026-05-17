import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase-config.js";
import type { User } from "../models/index.js";
import { getHospitalById } from "./hospitalService.js";

const USERS = "users";

export async function getUserById(id: string): Promise<User | null> {
  const doc = await db.collection(USERS).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Omit<User, "id">) };
}

export async function getUsersByHospital(hospitalId: string): Promise<User[]> {
  const snap = await db
    .collection(USERS)
    .where("hospitalId", "==", hospitalId)
    .where("role", "==", "NURSE")
    .get();
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<User, "id">),
  }));
}

export async function createUser(
  data: Omit<User, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const hospital = await getHospitalById(data.hospitalId);
  if (!hospital) {
    throw new Error(`Hospital not found: ${data.hospitalId}`);
  }

  const now = Timestamp.now();
  const ref = await db.collection(USERS).add({
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

/** RBAC: nurses may only act on inventory at their registered hospital. */
export function assertNurseHospitalAccess(user: User, hospitalId: string): void {
  if (user.role !== "NURSE") {
    throw new Error("Only nurses may perform inventory updates");
  }
  if (user.hospitalId !== hospitalId) {
    throw new Error(
      `Nurse ${user.name} is registered to a different hospital`
    );
  }
}
