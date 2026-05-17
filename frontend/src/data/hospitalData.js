export const THRESHOLDS = { ppe: 20, lifeSupport: 5, blood: 10, medication: 30, generalSupplies: 50 };

export function distanceMiles(loc1, loc2) {
  const R = 3958.8;
  const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
  const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const LOCAL_DUMMY_DATA = [
  // Existing hospitals
  { id: "hospital_uic", name: "UIC Medical Center", status: "CRITICAL_SHORTAGE", location: { latitude: 41.8708, longitude: -87.6710 }, inventory: { ppe: 5, lifeSupport: 2, blood: 3, medication: 8, generalSupplies: 60 } },
  { id: "hospital_northwestern", name: "Northwestern Memorial", status: "ADEQUATE", location: { latitude: 41.8950, longitude: -87.6210 }, inventory: { ppe: 45, lifeSupport: 18, blood: 32, medication: 95, generalSupplies: 120 } },
  { id: "hospital_rush", name: "Rush University Medical Center", status: "DONOR", location: { latitude: 41.8744, longitude: -87.6690 }, inventory: { ppe: 80, lifeSupport: 30, blood: 65, medication: 200, generalSupplies: 300 } },
  { id: "hospital_sinai", name: "Mount Sinai Hospital", status: "LOW", location: { latitude: 41.8610, longitude: -87.6946 }, inventory: { ppe: 25, lifeSupport: 3, blood: 7, medication: 25, generalSupplies: 20 } },
  // New hospitals
  { id: "hospital_stroger", name: "Stroger Hospital of Cook County", status: "DONOR", location: { latitude: 41.8747, longitude: -87.6775 }, inventory: { ppe: 110, lifeSupport: 42, blood: 90, medication: 310, generalSupplies: 420 } },
  { id: "hospital_masonic", name: "Illinois Masonic Medical Center", status: "DONOR", location: { latitude: 41.9405, longitude: -87.6569 }, inventory: { ppe: 95, lifeSupport: 25, blood: 78, medication: 180, generalSupplies: 260 } },
  { id: "hospital_saint_anthony", name: "Saint Anthony Hospital", status: "CRITICAL_SHORTAGE", location: { latitude: 41.8589, longitude: -87.7097 }, inventory: { ppe: 4, lifeSupport: 1, blood: 2, medication: 6, generalSupplies: 55 } },
  { id: "hospital_swedish", name: "Swedish Hospital", status: "LOW", location: { latitude: 41.9747, longitude: -87.6797 }, inventory: { ppe: 22, lifeSupport: 4, blood: 8, medication: 18, generalSupplies: 35 } },
  { id: "hospital_loretto", name: "Loretto Hospital", status: "ADEQUATE", location: { latitude: 41.8805, longitude: -87.7537 }, inventory: { ppe: 38, lifeSupport: 12, blood: 25, medication: 72, generalSupplies: 95 } },
];

export const DUMMY_TRANSFER_REQUEST = {
  id: "request_123",
  itemName: "Ventilator",
  quantity: 3,
  fromHospitalId: "hospital_rush",
  fromHospitalName: "Rush University Medical Center",
  toHospitalId: "hospital_uic",
  toHospitalName: "UIC Medical Center",
  status: "PENDING",
  distance: 2.1,
};
