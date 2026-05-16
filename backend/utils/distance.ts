import type { Hospital } from "../models/index.js";

function isValidCoord(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * Euclidean distance between two hospitals using lat/lng as flat coordinates.
 *
 * Hackathon-grade: not geographically accurate (no Haversine), but fine for
 * picking the "closest" donor among a regional cluster.
 *
 * Returns Infinity if either hospital is missing valid coordinates, so callers
 * that pick the minimum will never select a hospital with bad data.
 */
export function calculateDistance(a: Hospital, b: Hospital): number {
  const lat1 = a?.location?.latitude;
  const lng1 = a?.location?.longitude;
  const lat2 = b?.location?.latitude;
  const lng2 = b?.location?.longitude;

  if (
    !isValidCoord(lat1) ||
    !isValidCoord(lng1) ||
    !isValidCoord(lat2) ||
    !isValidCoord(lng2)
  ) {
    return Infinity;
  }

  const dLat = lat1 - lat2;
  const dLng = lng1 - lng2;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}
