import React, { useState, useEffect, useRef } from 'react';
import { Map, Marker, Popup, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { LOCAL_DUMMY_DATA, THRESHOLDS } from '../data/hospitalData';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";
const ROUTE_COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fb923c', '#f472b6'];

const getStatusColor = (status) => {
  switch (status) {
    case 'CRITICAL_SHORTAGE': return '#ef4444';
    case 'LOW': return '#f59e0b';
    case 'DONOR': return '#3b82f6';
    case 'ADEQUATE': default: return '#22c55e';
  }
};

const ITEM_KEY_MAP = {
  'Ventilator': 'lifeSupport', 'Life Support': 'lifeSupport',
  'Blood': 'blood', 'PPE': 'ppe',
  'Medication': 'medication', 'General Supplies': 'generalSupplies',
};

export default function MapViewer({ activeTransfers = [], onTransferRouted }) {
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [routesByTransferId, setRoutesByTransferId] = useState({});
  const fetchedIds = useRef(new Set());

  useEffect(() => {
    setHospitals(LOCAL_DUMMY_DATA);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    activeTransfers.forEach((transfer, i) => {
      if (fetchedIds.current.has(transfer.id)) return;
      fetchedIds.current.add(transfer.id);

      const origin = LOCAL_DUMMY_DATA.find(h => h.id === transfer.fromHospitalId);
      const dest = LOCAL_DUMMY_DATA.find(h => h.id === transfer.toHospitalId);
      if (!origin || !dest) return;

      const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.location.longitude},${origin.location.latitude};${dest.location.longitude},${dest.location.latitude}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;

      fetch(url).then(r => r.json()).then(data => {
        if (data.routes?.[0]) {
          const etaMins = Math.round(data.routes[0].duration / 60);
          setRoutesByTransferId(prev => ({
            ...prev,
            [transfer.id]: { geoJSON: data.routes[0].geometry, etaMins, color }
          }));
          onTransferRouted?.(transfer.id, etaMins);
        }
      });
    });

    // Clean up routes for removed transfers
    setRoutesByTransferId(prev => {
      const activeIds = new Set(activeTransfers.map(t => t.id));
      const next = {};
      for (const id in prev) { if (activeIds.has(id)) next[id] = prev[id]; }
      return next;
    });
    activeTransfers.forEach(t => {
      if (!activeTransfers.find(at => at.id === t.id)) fetchedIds.current.delete(t.id);
    });
  }, [activeTransfers]);

  if (isLoading) {
    return <div style={{ height: '100%', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#111', color: '#fff' }}>Loading Map...</div>;
  }

  const activeTransferIds = new Set(activeTransfers.map(t => t.id));
  const criticalUnmatched = hospitals.filter(h =>
    h.status === 'CRITICAL_SHORTAGE' && !activeTransfers.find(t => t.toHospitalId === h.id)
  );
  const hasCriticalAlert = criticalUnmatched.length > 0;

  const donorTransferMap = {};
  activeTransfers.forEach(t => {
    if (!donorTransferMap[t.fromHospitalId]) donorTransferMap[t.fromHospitalId] = [];
    donorTransferMap[t.fromHospitalId].push(t);
  });

  const renderPopup = (hospital) => {
    const pinColor = getStatusColor(hospital.status);
    const matchingTransfers = activeTransfers.filter(t =>
      t.toHospitalId === hospital.id || t.fromHospitalId === hospital.id
    );

    if (hospital.status === 'CRITICAL_SHORTAGE' && matchingTransfers.length > 0) {
      const t = matchingTransfers[0];
      const itemKey = ITEM_KEY_MAP[t.itemName];
      return (
        <div style={{ padding: '10px', color: '#1e293b', minWidth: '200px' }}>
          <h4 style={{ margin: '0 0 6px 0', fontWeight: 'bold', fontSize: '14px' }}>{hospital.name}</h4>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#ef4444' }}>Status: CRITICAL</p>
          <p style={{ margin: '0 0 4px 0', fontSize: '13px' }}>{t.itemName}: <strong>{hospital.inventory[itemKey]}</strong> available</p>
          <p style={{ margin: '0 0 0 0', fontSize: '13px', color: '#ef4444' }}>Needs: <strong>{t.quantity} {t.itemName}s</strong></p>
          {matchingTransfers.length > 1 && <p style={{ marginTop: '6px', fontSize: '12px', color: '#64748b' }}>{matchingTransfers.length} transfers inbound</p>}
        </div>
      );
    }

    if (hospital.status === 'DONOR' && matchingTransfers.length > 0) {
      return (
        <div style={{ padding: '10px', color: '#1e293b', minWidth: '200px' }}>
          <h4 style={{ margin: '0 0 6px 0', fontWeight: 'bold', fontSize: '14px' }}>{hospital.name}</h4>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#3b82f6', background: '#eff6ff', padding: '3px 8px', borderRadius: '4px', display: 'inline-block' }}>
            Active Donor · {matchingTransfers.length} transfer{matchingTransfers.length > 1 ? 's' : ''}
          </p>
          {matchingTransfers.map(t => {
            const surplus = hospital.inventory[ITEM_KEY_MAP[t.itemName]] - THRESHOLDS[ITEM_KEY_MAP[t.itemName]];
            return (
              <p key={t.id} style={{ margin: '6px 0 0 0', fontSize: '13px' }}>
                → {t.toHospitalName}: <strong>{t.quantity} {t.itemName}s</strong> (surplus: {surplus})
              </p>
            );
          })}
        </div>
      );
    }

    return (
      <div style={{ padding: '8px', color: '#1e293b', minWidth: '190px' }}>
        <h4 style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{hospital.name}</h4>
        <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold', color: pinColor }}>{hospital.status}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
          {[['PPE', 'ppe'], ['Life Support', 'lifeSupport'], ['Blood', 'blood'], ['Medication', 'medication'], ['General Supplies', 'generalSupplies']].map(([label, key]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{label}</span>
              <span style={{ color: hospital.inventory[key] < THRESHOLDS[key] ? '#ef4444' : 'inherit' }}>{hospital.inventory[key]}</span>
            </div>
          ))}
        </div>
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
        .mapboxgl-popup-close-button {
          font-size: 22px; width: 32px; height: 32px;
          line-height: 32px; padding: 0; right: 4px; top: 4px;
        }
      `}</style>

      {hasCriticalAlert && (
        <div style={{ position: 'absolute', top: 0, right: '24px', zIndex: 20, background: 'rgba(127, 0, 0, 0.45)', color: '#fff', padding: '10px 24px', borderRadius: '0 0 10px 10px', borderBottom: '2px solid #ef4444', borderLeft: '1px solid #ef4444', borderRight: '1px solid #ef4444', display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '480px', backdropFilter: 'blur(4px)' }}>
          <span style={{ fontSize: '18px' }}>🚨</span>
          <span style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.03em', lineHeight: 1.5 }}>
            {criticalUnmatched.length} CRITICAL SHORTAGE{criticalUnmatched.length > 1 ? 'S' : ''} DETECTED:{' '}
            {criticalUnmatched.map(h => h.name).join(', ')}. See Mission Log.
          </span>
        </div>
      )}

      <Map initialViewState={{ longitude: -87.6298, latitude: 41.8781, zoom: 11 }} mapStyle="mapbox://styles/mapbox/dark-v11" mapboxAccessToken={MAPBOX_TOKEN}>
        {activeTransfers.map(transfer => {
          const route = routesByTransferId[transfer.id];
          if (!route) return null;
          return (
            <Source key={transfer.id} id={`route-${transfer.id}`} type="geojson" data={{ type: 'Feature', properties: {}, geometry: route.geoJSON }}>
              <Layer id={`line-${transfer.id}`} type="line" paint={{ 'line-color': route.color, 'line-width': 5, 'line-opacity': 0.8 }} />
            </Source>
          );
        })}

        {hospitals.map(hospital => {
          if (!hospital.location) return null;
          const pinColor = getStatusColor(hospital.status);
          const isActiveDonor = !!donorTransferMap[hospital.id]?.length;
          const isActiveRecipient = activeTransfers.some(t => t.toHospitalId === hospital.id);
          const pinSize = hospital.status === 'DONOR' ? '28px' : '22px';
          const pinStyle = {
            backgroundColor: pinColor,
            width: pinSize,
            height: pinSize,
            borderRadius: '50%',
            border: (isActiveDonor || isActiveRecipient) ? '3px solid #fff' : '2px solid rgba(255,255,255,0.3)',
            boxShadow: (isActiveDonor || isActiveRecipient) ? `0 0 15px ${pinColor}` : `0 0 8px ${pinColor}`,
            cursor: 'pointer',
            animation: isActiveDonor ? 'donor-pulse 1.5s ease-in-out infinite' : 'none',
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
