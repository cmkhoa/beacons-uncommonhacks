import React, { useState, useEffect } from 'react';
import { Map, Marker, Popup, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

const getStatusColor = (status) => {
  switch (status) {
    case 'CRITICAL': return '#ef4444';
    case 'LOW': return '#f59e0b';
    case 'DONOR': return '#3b82f6';
    case 'OK': default: return '#22c55e';
  }
};

const LOCAL_DUMMY_DATA = [
  { id: "h1", name: "Chicago Mercy", status: "CRITICAL", location: { latitude: 41.8494, longitude: -87.6244 }, inventory: { bloodBags: 3, pharmaceuticals: 11, devices: 2 } },
  { id: "h2", name: "Northwestern Memorial", status: "OK", location: { latitude: 41.8950, longitude: -87.6210 }, inventory: { bloodBags: 27, pharmaceuticals: 80, devices: 15 } },
  { id: "h3", name: "Rush University", status: "DONOR", location: { latitude: 41.8744, longitude: -87.6690 }, inventory: { bloodBags: 54, pharmaceuticals: 120, devices: 33 } },
  { id: "h4", name: "Mount Sinai", status: "LOW", location: { latitude: 41.8610, longitude: -87.6946 }, inventory: { bloodBags: 8, pharmaceuticals: 22, devices: 5 } }
];

export default function MapViewer() {
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', fontFamily: 'Arial, sans-serif' }}>
      {etaMins && (
        <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(15, 23, 42, 0.9)', color: '#fff', padding: '15px 25px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 10 }}>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Est. Transfer Time</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8' }}>{etaMins} mins</div>
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

          return (
            <React.Fragment key={hospital.id}>
              <Marker longitude={hospital.location.longitude} latitude={hospital.location.latitude} anchor="bottom">
                <div onClick={(e) => { e.stopPropagation(); setSelectedHospital(hospital); }} style={{ backgroundColor: pinColor, width: hospital.status === 'DONOR' ? '28px' : '22px', height: hospital.status === 'DONOR' ? '28px' : '22px', borderRadius: '50%', border: (isOrigin || isDest) ? '3px solid #fff' : '2px solid rgba(255,255,255,0.3)', boxShadow: (isOrigin || isDest) ? `0 0 15px ${pinColor}` : `0 0 8px ${pinColor}`, cursor: 'pointer' }} />
              </Marker>

              {selectedHospital?.id === hospital.id && (
                <Popup longitude={hospital.location.longitude} latitude={hospital.location.latitude} anchor="top" onClose={() => setSelectedHospital(null)} closeOnClick={false}>
                  <div style={{ padding: '8px', color: '#333', minWidth: '180px' }}>
                    <h4 style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{hospital.name}</h4>
                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold', color: pinColor }}>{hospital.status}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Blood Bags</span><span>{hospital.inventory.bloodBags}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Pharmaceuticals</span><span>{hospital.inventory.pharmaceuticals}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Devices</span><span>{hospital.inventory.devices}</span></div>
                    </div>
                    {hospital.status === 'DONOR' && <button onClick={() => { setRouteOrigin(hospital); setSelectedHospital(null); }} style={{ width: '100%', background: '#3b82f6', color: '#fff', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: '4px' }}>Set as Supply Origin</button>}
                    {(hospital.status === 'CRITICAL' || hospital.status === 'LOW') && <button onClick={() => { setRouteDest(hospital); setSelectedHospital(null); }} style={{ width: '100%', background: '#ef4444', color: '#fff', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: '4px' }}>Set as Destination</button>}
                  </div>
                </Popup>
              )}
            </React.Fragment>
          );
        })}
      </Map>
    </div>
  );
}