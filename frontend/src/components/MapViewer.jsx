import React, { useState, useEffect, useRef } from 'react';
import { Map, Marker, Popup, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

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

const ENTRY_STATUS_LABEL = {
  CRITICAL_SHORTAGE: 'Critical',
  LOW: 'Low',
  ADEQUATE: 'OK',
  SURPLUS: 'Surplus',
};

const ENTRY_STATUS_COLOR = {
  CRITICAL_SHORTAGE: '#ef4444',
  LOW: '#f59e0b',
  ADEQUATE: '#22c55e',
  SURPLUS: '#3b82f6',
};

export default function MapViewer({
  hospitals = [],
  itemMap = new Map(),
  activeTransfers = [],
  onTransferRouted,
}) {
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [routesByTransferId, setRoutesByTransferId] = useState({});
  const fetchedIds = useRef(new Set());

  useEffect(() => {
    activeTransfers.forEach((transfer, i) => {
      if (fetchedIds.current.has(transfer.id)) return;
      fetchedIds.current.add(transfer.id);

      const origin = hospitals.find((h) => h.id === transfer.fromHospitalId);
      const dest = hospitals.find((h) => h.id === transfer.toHospitalId);
      if (!origin?.location || !dest?.location) return;

      const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.location.longitude},${origin.location.latitude};${dest.location.longitude},${dest.location.latitude}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;

      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          if (data.routes?.[0]) {
            const etaMins = Math.round(data.routes[0].duration / 60);
            setRoutesByTransferId((prev) => ({
              ...prev,
              [transfer.id]: { geoJSON: data.routes[0].geometry, etaMins, color },
            }));
            onTransferRouted?.(transfer.id, etaMins);
          }
        })
        .catch(() => {});
    });

    setRoutesByTransferId((prev) => {
      const activeIds = new Set(activeTransfers.map((t) => t.id));
      const next = {};
      for (const id in prev) {
        if (activeIds.has(id)) next[id] = prev[id];
      }
      return next;
    });

    const liveIds = new Set(activeTransfers.map((t) => t.id));
    for (const id of [...fetchedIds.current]) {
      if (!liveIds.has(id)) fetchedIds.current.delete(id);
    }
  }, [activeTransfers, hospitals]);

  const donorTransferMap = {};
  activeTransfers.forEach((t) => {
    if (!donorTransferMap[t.fromHospitalId]) donorTransferMap[t.fromHospitalId] = [];
    donorTransferMap[t.fromHospitalId].push(t);
  });

  const renderPopup = (hospital) => {
    const pinColor = getStatusColor(hospital.status);
    const matchingTransfers = activeTransfers.filter(
      (t) => t.toHospitalId === hospital.id || t.fromHospitalId === hospital.id
    );
    const inventoryEntries = Array.isArray(hospital.inventory)
      ? hospital.inventory
      : [];

    if (hospital.status === 'CRITICAL_SHORTAGE' && matchingTransfers.length > 0) {
      const t = matchingTransfers[0];
      const entry = inventoryEntries.find((e) => e.itemId === t.itemId);
      return (
        <div style={{ padding: '10px', color: '#1e293b', minWidth: '200px' }}>
          <h4 style={{ margin: '0 0 6px 0', fontWeight: 'bold', fontSize: '14px' }}>{hospital.name}</h4>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#ef4444' }}>Status: CRITICAL</p>
          {entry && (
            <p style={{ margin: '0 0 4px 0', fontSize: '13px' }}>
              {t.itemName}: <strong>{entry.availableCount}</strong> available
            </p>
          )}
          <p style={{ margin: 0, fontSize: '13px', color: '#ef4444' }}>
            Needs: <strong>{t.quantity} {t.itemName}</strong>
          </p>
          {matchingTransfers.length > 1 && (
            <p style={{ marginTop: '6px', fontSize: '12px', color: '#64748b' }}>
              {matchingTransfers.length} transfers inbound
            </p>
          )}
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
          {matchingTransfers.map((t) => {
            const entry = inventoryEntries.find((e) => e.itemId === t.itemId);
            const surplus = entry ? entry.availableCount - (entry.threshold ?? 0) : null;
            return (
              <p key={t.id} style={{ margin: '6px 0 0 0', fontSize: '13px' }}>
                → {t.toHospitalName}: <strong>{t.quantity} {t.itemName}</strong>
                {surplus !== null && ` (surplus: ${surplus})`}
              </p>
            );
          })}
        </div>
      );
    }

    return (
      <div style={{ padding: '8px', color: '#1e293b', minWidth: '200px', maxWidth: '260px' }}>
        <h4 style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{hospital.name}</h4>
        <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold', color: pinColor }}>{hospital.status}</p>
        {inventoryEntries.length === 0 ? (
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>No inventory data.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', maxHeight: '180px', overflowY: 'auto' }}>
            {inventoryEntries.map((entry) => {
              const item = itemMap.get(entry.itemId);
              const name = item?.name ?? entry.itemId;
              const color = ENTRY_STATUS_COLOR[entry.status] ?? '#1e293b';
              return (
                <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <span>{name}</span>
                  <span style={{ color, fontWeight: 600 }}>
                    {entry.availableCount} · {ENTRY_STATUS_LABEL[entry.status] ?? entry.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
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

      <Map initialViewState={{ longitude: -87.6298, latitude: 41.8781, zoom: 11 }} mapStyle="mapbox://styles/mapbox/dark-v11" mapboxAccessToken={MAPBOX_TOKEN}>
        {activeTransfers.map((transfer) => {
          const route = routesByTransferId[transfer.id];
          if (!route) return null;
          return (
            <Source key={transfer.id} id={`route-${transfer.id}`} type="geojson" data={{ type: 'Feature', properties: {}, geometry: route.geoJSON }}>
              <Layer id={`line-${transfer.id}`} type="line" paint={{ 'line-color': route.color, 'line-width': 5, 'line-opacity': 0.8 }} />
            </Source>
          );
        })}

        {hospitals.map((hospital) => {
          if (!hospital.location) return null;
          const pinColor = getStatusColor(hospital.status);
          const isActiveDonor = !!donorTransferMap[hospital.id]?.length;
          const isActiveRecipient = activeTransfers.some((t) => t.toHospitalId === hospital.id);
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
