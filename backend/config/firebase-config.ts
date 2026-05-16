import admin from "firebase-admin";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let db: Firestore | null = null;

/**
 * Initializes Firebase Admin from env vars.
 * Stub-friendly: logs and skips full init if credentials are missing (local dev).
 */
function initFirebase(): Firestore {
  if (db) return db;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.log(
      "[Firebase] Stub mode — set FIREBASE_* in .env to enable Firestore"
    );
    // Minimal app so getFirestore() does not throw during hackathon scaffolding
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: projectId ?? "beacon-stub" });
    }
    db = getFirestore();
    return db;
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  console.log("[Firebase] Admin SDK initialized for project:", projectId);
  db = getFirestore();
  return db;
}

/** Firestore instance — call initFirebase() once at app startup if you prefer lazy init */
const firestore = initFirebase();

export { initFirebase, firestore as db };
