import React, { useState, useEffect } from 'react';
import { Map, Marker, Popup, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

const getStatusColor = (status) => {
  switch (status) {
    case 'CRITICAL_SHORTAGE': return '#ef4444';
    case 'LOW': return '#f59e0b';
    case 'DONOR': return '#3b82f6';
    case 'ADEQUATE': default: return '#22c55e';
  }
};

// Thresholds: below these values = shortage
const THRESHOLDS = { ppe: 20, lifeSupport: 5, blood: 10, medication: 30, generalSupplies: 50 };

const LOCAL_DUMMY_DATA = [
  // CRITICAL: short on ppe, lifeSupport, blood, medication — generalSupplies is fine
  { id: "hospital_uic", name: "UIC Medical Center", status: "CRITICAL_SHORTAGE", location: { latitude: 41.8708, longitude: -87.6710 }, inventory: { ppe: 5, lifeSupport: 2, blood: 3, medication: 8, generalSupplies: 60 } },
  // ADEQUATE: all above thresholds
  { id: "hospital_northwestern", name: "Northwestern Memorial", status: "ADEQUATE", location: { latitude: 41.8950, longitude: -87.6210 }, inventory: { ppe: 45, lifeSupport: 18, blood: 32, medication: 95, generalSupplies: 120 } },
  // DONOR: well-stocked across the board
  { id: "hospital_rush", name: "Rush University Medical Center", status: "DONOR", location: { latitude: 41.8744, longitude: -87.6690 }, inventory: { ppe: 80, lifeSupport: 30, blood: 65, medication: 200, generalSupplies: 300 } },
  // LOW: short on lifeSupport, blood, medication, generalSupplies — ppe is fine
  { id: "hospital_sinai", name: "Mount Sinai Hospital", status: "LOW", location: { latitude: 41.8610, longitude: -87.6946 }, inventory: { ppe: 25, lifeSupport: 3, blood: 7, medication: 25, generalSupplies: 20 } },
];

const DUMMY_TRANSFER_REQUEST = {
  id: "request_123",
  itemName: "Ventilator",
  quantity: 3,
  fromHospitalId: "hospital_rush",
  fromHospitalName: "Rush University Medical Center",
  toHospitalId: "hospital_uic",
  toHospitalName: "UIC Medical Center",
  status: "PENDING",
  distance: 2.1
};

export default function MapViewer() {
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTransferRequest, setActiveTransferRequest] = useState(DUMMY_TRANSFER_REQUEST);

  const [routeOrigin, setRouteOrigin] = useState(null);
  const [routeDest, setRouteDest] = useState(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  const [etaMins, setEtaMins] = useState(null);

  useEffect(() => {
    setHospitals(LOCAL_DUMMY_DATA);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (routeOrigin && routeDest) {
      const fetchRoute = async () => {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${routeOrigin.location.longitude},${routeOrigin.location.latitude};${routeDest.location.longitude},${routeDest.location.latitude}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.routes && data.routes[0]) {
          setRouteGeoJSON(data.routes[0].geometry);
          setEtaMins(Math.round(data.routes[0].duration / 60));
        }
      };
      fetchRoute();
    } else {
      setRouteGeoJSON(null);
      setEtaMins(null);
    }
  }, [routeOrigin, routeDest]);

  if (isLoading) {
    return <div style={{ height: '100%', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#111', color: '#fff' }}>Loading Map...</div>;
  }

  const routeActive = routeOrigin !== null && routeDest !== null;
  const hasCriticalAlert = !routeActive && (
    activeTransferRequest?.status === 'PENDING' ||
    hospitals.some(h => h.status === 'CRITICAL_SHORTAGE')
  );

  const shortItems = routeDest?.inventory
    ? [
        routeDest.inventory.ppe < THRESHOLDS.ppe && 'PPE',
        routeDest.inventory.lifeSupport < THRESHOLDS.lifeSupport && 'Life Support',
        routeDest.inventory.blood < THRESHOLDS.blood && 'Blood',
        routeDest.inventory.medication < THRESHOLDS.medication && 'Medication',
        routeDest.inventory.generalSupplies < THRESHOLDS.generalSupplies && 'General Supplies',
      ].filter(Boolean)
    : [];
  const transferLabel = shortItems.length > 0
    ? `Transferring ${shortItems.join(', ')} → ${etaMins} min`
    : `ETA ${etaMins} min`;

  // Maps transfer request itemName → inventory key
  const ITEM_KEY_MAP = {
    'Ventilator': 'lifeSupport',
    'Blood': 'blood',
    'PPE': 'ppe',
    'Medication': 'medication',
    'General Supplies': 'generalSupplies',
  };

  const renderPopup = (hospital) => {
    const pinColor = getStatusColor(hospital.status);
    const isCritical = hospital.status === 'CRITICAL_SHORTAGE';
    const isMatchedDonor = hospital.status === 'DONOR' &&
      activeTransferRequest?.fromHospitalId === hospital.id;
    const itemKey = activeTransferRequest ? ITEM_KEY_MAP[activeTransferRequest.itemName] : null;
    const itemAmount = itemKey != null ? hospital.inventory[itemKey] : null;
    const surplus = itemKey != null ? hospital.inventory[itemKey] - THRESHOLDS[itemKey] : null;

    if (isCritical && activeTransferRequest) {
      return (
        <div style={{ padding: '10px', color: '#1e293b', minWidth: '200px' }}>
          <h4 style={{ margin: '0 0 6px 0', fontWeight: 'bold', fontSize: '14px' }}>{hospital.name}</h4>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#ef4444' }}>Status: CRITICAL</p>
          <p style={{ margin: '0 0 4px 0', fontSize: '13px' }}>
            {activeTransferRequest.itemName}: <strong>{itemAmount}</strong> available
          </p>
          <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#ef4444' }}>
            Needs: <strong>{activeTransferRequest.quantity} {activeTransferRequest.itemName}s</strong>
          </p>
          <button onClick={() => { setRouteDest(hospital); setSelectedHospital(null); }} style={{ width: '100%', background: '#ef4444', color: '#fff', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }}>
            Set as Destination
          </button>
        </div>
      );
    }

    if (isMatchedDonor) {
      return (
        <div style={{ padding: '10px', color: '#1e293b', minWidth: '200px' }}>
          <h4 style={{ margin: '0 0 6px 0', fontWeight: 'bold', fontSize: '14px' }}>{hospital.name}</h4>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#3b82f6', background: '#eff6ff', padding: '3px 8px', borderRadius: '4px', display: 'inline-block' }}>
            Matched Donor
          </p>
          <p style={{ margin: '8px 0 10px 0', fontSize: '13px' }}>
            {activeTransferRequest.itemName} surplus: <strong>{surplus}</strong> available above threshold
          </p>
          <button onClick={() => { setRouteOrigin(hospital); setSelectedHospital(null); }} style={{ width: '100%', background: '#3b82f6', color: '#fff', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }}>
            Set as Supply Origin
          </button>
        </div>
      );
    }

    // Default popup: full inventory table
    return (
      <div style={{ padding: '8px', color: '#1e293b', minWidth: '190px' }}>
        <h4 style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{hospital.name}</h4>
        <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold', color: pinColor }}>{hospital.status}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px', fontSize: '13px' }}>
          {[['PPE', 'ppe'], ['Life Support', 'lifeSupport'], ['Blood', 'blood'], ['Medication', 'medication'], ['General Supplies', 'generalSupplies']].map(([label, key]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{label}</span>
              <span style={{ color: hospital.inventory[key] < THRESHOLDS[key] ? '#ef4444' : 'inherit' }}>{hospital.inventory[key]}</span>
            </div>
          ))}
        </div>
        {hospital.status === 'DONOR' && <button onClick={() => { setRouteOrigin(hospital); setSelectedHospital(null); }} style={{ width: '100%', background: '#3b82f6', color: '#fff', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: '4px' }}>Set as Supply Origin</button>}
        {(hospital.status === 'CRITICAL_SHORTAGE' || hospital.status === 'LOW') && <button onClick={() => { setRouteDest(hospital); setSelectedHospital(null); }} style={{ width: '100%', background: '#ef4444', color: '#fff', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: '4px' }}>Set as Destination</button>}
      </div>
    );
  };

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @keyframes donor-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.6), 0 0 8px #3b82f6; }
          50% { box-shadow: 0 0 0 10px rgba(59,130,246,0), 0 0 20px #3b82f6; }
        }
      `}</style>
      {/* Critical Alert Banner */}
      {hasCriticalAlert && activeTransferRequest && (
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 20, background: 'rgba(127, 0, 0, 0.92)', color: '#fff', padding: '10px 24px', borderRadius: '0 0 10px 10px', borderBottom: '2px solid #ef4444', borderLeft: '1px solid #ef4444', borderRight: '1px solid #ef4444', display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '720px', width: '90%', backdropFilter: 'blur(4px)' }}>
          <span style={{ fontSize: '18px' }}>🚨</span>
          <span style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.03em', lineHeight: 1.5 }}>
            CRITICAL SHORTAGE DETECTED: <strong>{activeTransferRequest.toHospitalName}</strong> is below{' '}
            <strong>{activeTransferRequest.itemName}</strong> threshold. Beacon matched{' '}
            <strong>{activeTransferRequest.fromHospitalName}</strong> as the nearest donor.
          </span>
        </div>
      )}

      {/* ETA / Transfer Info Box */}
      {etaMins && (
        <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(15, 23, 42, 0.9)', color: '#fff', padding: '15px 25px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 10 }}>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Active Transfer</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#38bdf8' }}>{transferLabel}</div>
          </div>
          <button onClick={() => { setRouteOrigin(null); setRouteDest(null); setSelectedHospital(null); }} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
            Clear Route
          </button>
        </div>
      )}

      <Map initialViewState={{ longitude: -87.6298, latitude: 41.8781, zoom: 11 }} mapStyle="mapbox://styles/mapbox/dark-v11" mapboxAccessToken={MAPBOX_TOKEN}>
        {routeGeoJSON && (
          <Source id="route-source" type="geojson" data={{ type: 'Feature', properties: {}, geometry: routeGeoJSON }}>
            <Layer id="route-line" type="line" paint={{ 'line-color': '#38bdf8', 'line-width': 5, 'line-opacity': 0.8 }} />
          </Source>
        )}

        {hospitals.map(hospital => {
          if (!hospital.location) return null;
          const pinColor = getStatusColor(hospital.status);
          const isOrigin = routeOrigin?.id === hospital.id;
          const isDest = routeDest?.id === hospital.id;
          const isMatchedDonor = hospital.status === 'DONOR' &&
            activeTransferRequest?.fromHospitalId === hospital.id;
          const pinSize = hospital.status === 'DONOR' ? '28px' : '22px';
          const pinStyle = {
            backgroundColor: pinColor,
            width: pinSize,
            height: pinSize,
            borderRadius: '50%',
            border: (isOrigin || isDest) ? '3px solid #fff' : '2px solid rgba(255,255,255,0.3)',
            boxShadow: (isOrigin || isDest) ? `0 0 15px ${pinColor}` : `0 0 8px ${pinColor}`,
            cursor: 'pointer',
            animation: isMatchedDonor ? 'donor-pulse 1.5s ease-in-out infinite' : 'none',
          };

          return (
            <React.Fragment key={hospital.id}>
              <Marker longitude={hospital.location.longitude} latitude={hospital.location.latitude} anchor="bottom">
                <div onClick={(e) => { e.stopPropagation(); setSelectedHospital(hospital); }} style={pinStyle} />
              </Marker>

              {selectedHospital?.id === hospital.id && (
                <Popup longitude={hospital.location.longitude} latitude={hospital.location.latitude} anchor="top" onClose={() => setSelectedHospital(null)} closeOnClick={false}>
                  {renderPopup(hospital)}
                </Popup>
              )}
            </React.Fragment>
          );
        })}
      </Map>
    </div>
  );
}