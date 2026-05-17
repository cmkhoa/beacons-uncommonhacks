export const THRESHOLDS = { ppe: 20, lifeSupport: 5, blood: 10, medication: 30, generalSupplies: 50 };

export const LOCAL_DUMMY_DATA = [
  { id: "hospital_uic", name: "UIC Medical Center", status: "CRITICAL_SHORTAGE", location: { latitude: 41.8708, longitude: -87.6710 }, inventory: { ppe: 5, lifeSupport: 2, blood: 3, medication: 8, generalSupplies: 60 } },
  { id: "hospital_northwestern", name: "Northwestern Memorial", status: "ADEQUATE", location: { latitude: 41.8950, longitude: -87.6210 }, inventory: { ppe: 45, lifeSupport: 18, blood: 32, medication: 95, generalSupplies: 120 } },
  { id: "hospital_rush", name: "Rush University Medical Center", status: "DONOR", location: { latitude: 41.8744, longitude: -87.6690 }, inventory: { ppe: 80, lifeSupport: 30, blood: 65, medication: 200, generalSupplies: 300 } },
  { id: "hospital_sinai", name: "Mount Sinai Hospital", status: "LOW", location: { latitude: 41.8610, longitude: -87.6946 }, inventory: { ppe: 25, lifeSupport: 3, blood: 7, medication: 25, generalSupplies: 20 } },
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
