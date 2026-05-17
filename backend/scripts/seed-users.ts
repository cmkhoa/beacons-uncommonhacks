/**
 * Seed one nurse per hospital (run after seed-hospitals.ts).
 *
 * Usage:  npx tsx scripts/seed-users.ts
 */

import "dotenv/config";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase-config.js";

const NURSES_BY_HOSPITAL_NAME: Record<string, string> = {
  "Northwestern Memorial Hospital": "Alex Rivera",
  "Rush University Medical Center": "Jordan Kim",
  "UChicago Medical Center": "Sam Patel",
  "Advocate Christ Medical Center": "Taylor Nguyen",
  "Loyola University Medical Center": "Morgan Lee",
};

async function seed() {
  const hospitalsSnap = await db.collection("hospitals").get();
  if (hospitalsSnap.empty) {
    console.error("No hospitals found. Run seed-hospitals.ts first.");
    process.exit(1);
  }

  let count = 0;
  const now = Timestamp.now();
  const seededHospitalNames = new Set<string>();

  for (const doc of hospitalsSnap.docs) {
    const name = doc.data().name as string;
    if (seededHospitalNames.has(name)) continue;

    const nurseName = NURSES_BY_HOSPITAL_NAME[name];
    if (!nurseName) {
      console.warn(`Skipping unknown hospital: ${name}`);
      continue;
    }

    const existing = await db
      .collection("users")
      .where("hospitalId", "==", doc.id)
      .where("role", "==", "NURSE")
      .limit(1)
      .get();

    if (!existing.empty) {
      seededHospitalNames.add(name);
      continue;
    }

    await db.collection("users").add({
      name: nurseName,
      role: "NURSE",
      hospitalId: doc.id,
      createdAt: now,
      updatedAt: now,
    });
    seededHospitalNames.add(name);
    count++;
    console.log(`  + ${nurseName} @ ${name}`);
  }

  console.log(`✅  Seeded ${count} nurse(s)`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
