/* eslint-disable */
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';

// Lookup dictionary for Indian Railway Station coordinates
const STATION_COORDS = {
  "NDLS": [28.6143, 77.2147],
  "MMCT": [18.9696, 72.8193],
  "HWH": [22.5833, 88.3386],
  "MAS": [13.0827, 80.2707],
  "RKMP": [23.2033, 77.4589],
  "AGC": [27.1587, 77.9908],
  "GWL": [26.2124, 78.1772],
  "VGLJ": [25.4484, 78.5685],
  "TVC": [8.4817, 76.9515],
  "MTJ": [27.4924, 77.6737],
  "MSB": [13.0906, 80.2831],
  "BDTS": [19.0644, 72.8358],
  "ADI": [23.0225, 72.5714],
  "PNBE": [25.6022, 85.1376],
  "SBC": [12.9779, 77.5696]
};

// Center of India map view
const MAP_CENTER = [21.7679, 78.8718]; 

// Create custom icons representing train status on the map
const createCustomMarker = (status, delay) => {
  let color = '#10b981'; // nominal (green)
  if (status === 'cancelled' || delay > 60) {
    color = '#ef4444'; // critical (red)
  } else if (status === 'delayed' || delay > 15) {
    color = '#f59e0b'; // warning (yellow)
  }

  return L.divIcon({
    html: `<div style="
      position: relative;
      width: 14px;
      height: 14px;
      background-color: ${color};
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 8px ${color};
      cursor: pointer;
    "></div>`,
    className: 'custom-train-marker-wrapper',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

export default function LiveMap({ trains = [] }) {
  // Setup fallback default trains if data is empty
  const activeTrains = trains.length > 0 ? trains : [
    {
      train_number: "12002",
      train_name: "Chennai Exp",
      train_id: "TN-4022",
      speed: "84 km/h",
      next_station: "MSB",
      distance_next: "0.4 KM",
      current_station: "MAS",
      delay_minutes: 0,
      status: "On Time"
    },
    {
      train_number: "12952",
      train_name: "Mumbai Rajdhani",
      train_id: "TN-1295",
      speed: "110 km/h",
      next_station: "AGC",
      distance_next: "12 KM",
      current_station: "NDLS",
      delay_minutes: 0,
      status: "On Time"
    },
    {
      train_number: "12260",
      train_name: "Howrah Duronto",
      train_id: "TN-1226",
      speed: "45 km/h",
      next_station: "HWH",
      distance_next: "3.2 KM",
      current_station: "AGC",
      delay_minutes: 75,
      status: "Delayed"
    }
  ];

  return (
    <div style={{
      flex: 1,
      height: '100%',
      position: 'relative',
      backgroundColor: '#0b0d10'
    }}>
      <MapContainer 
        center={MAP_CENTER} 
        zoom={5} 
        zoomControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Dark style tile layer */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        
        {/* Render zoom controls in bottom-right corner */}
        <ZoomControl position="bottomright" />

        {/* Place train markers */}
        {activeTrains.map((train, idx) => {
          // Determine coordinate
          let position;
          if (train.lat !== undefined && train.lng !== undefined) {
            position = [Number(train.lat), Number(train.lng)];
          } else {
            position = STATION_COORDS[train.current_station] || STATION_COORDS["NDLS"];
          }
          // Offset slightly if markers overlap (only for fallback trains without coordinates)
          if (train.lat === undefined || train.lng === undefined) {
            if (idx === 1) position = [position[0] - 0.5, position[1] + 0.8];
            if (idx === 2) position = [position[0] + 0.6, position[1] - 0.4];
          }

          const statusText = train.delay_minutes > 15 ? 'DELAYED' : 'ON TIME';
          const isDelayed = train.delay_minutes > 15;
          const markerIcon = createCustomMarker(train.status?.toLowerCase(), train.delay_minutes);

          return (
            <Marker 
              key={train.train_number || idx} 
              position={position}
              icon={markerIcon}
            >
              <Popup closeButton={false} minWidth={220}>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#161920',
                  color: '#e2e8f0',
                  fontFamily: 'inherit',
                  borderRadius: '6px'
                }}>
                  {/* Tooltip Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      backgroundColor: isDelayed ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: isDelayed ? '#f59e0b' : '#10b981',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      letterSpacing: '0.5px'
                    }}>
                      {statusText}
                    </span>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>#{train.train_number}</span>
                  </div>

                  {/* Tooltip Body */}
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                    {train.train_name || 'Train Express'}
                  </h3>
                  <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>
                    ID: {train.train_id || `TN-${train.train_number}`} • V: {train.speed || '80 km/h'}
                  </p>

                  <div style={{ height: '1px', backgroundColor: '#1a1e26', margin: '8px 0' }}></div>

                  {/* Tooltip Footer */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    fontWeight: 500
                  }}>
                    <span style={{ color: '#64748b' }}>NEXT: <strong style={{ color: '#cbd5e1' }}>{train.next_station || 'MAS'}</strong></span>
                    <span style={{ color: '#3b82f6' }}>{train.distance_next || '0.5 KM'}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
