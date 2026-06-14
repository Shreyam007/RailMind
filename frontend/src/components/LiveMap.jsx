/* eslint-disable */
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Complete Indian Railway Station coordinates matching railways_api.py
const STATION_COORDS = {
  // North India
  "NDLS": [28.6419, 77.2194],
  "DLI": [28.6562, 77.2410],
  "CNB": [26.4499, 80.3319],
  "LKO": [26.8467, 80.9462],
  "ALD": [25.4358, 81.8463],
  "BSB": [25.3176, 82.9739],
  "GKP": [26.7606, 83.3732],
  "AGC": [27.1767, 78.0081],
  "MTJ": [27.4924, 77.6737],
  "ALJN": [27.8974, 78.0880],
  "MB": [28.9845, 77.7064],
  "SRE": [29.9691, 77.5469],
  "AMB": [30.3782, 76.7767],
  "ASR": [31.6340, 74.8723],
  "LDH": [30.9010, 75.8573],
  "UMB": [30.9167, 76.9500],
  "HW": [29.9457, 78.1642],
  "DDN": [30.3165, 78.0322],

  // Bihar & Jharkhand
  "PNBE": [25.6093, 85.1235],
  "RJPB": [25.6093, 85.1390],
  "BGP": [25.2425, 86.9842],
  "MFP": [26.1197, 85.3910],
  "DBG": [26.1522, 85.8970],
  "SPJ": [25.8645, 85.7810],
  "DHN": [23.7957, 86.4304],
  "JSME": [24.1540, 86.2028],
  "RNC": [23.3441, 85.3096],

  // West Bengal
  "HWH": [22.5958, 88.2636],
  "SDAH": [22.5697, 88.3697],
  "KOAA": [22.5726, 88.3639],
  "BDC": [22.8456, 88.3632],
  "BWN": [23.2324, 87.8615],
  "KGP": [22.3460, 87.3195],

  // Maharashtra
  "CSTM": [18.9398, 72.8355],
  "BCT": [18.9690, 72.8205],
  "LTT": [19.0668, 72.9244],
  "PUNE": [18.5286, 73.8742],
  "NGP": [21.1458, 79.0882],
  "AWB": [19.8762, 75.3433],
  "NED": [19.1566, 77.3212],
  "SUR": [17.6868, 75.9064],

  // Karnataka
  "SBC": [12.9784, 77.5736],
  "YPR": [13.0148, 77.5510],
  "UBL": [15.3647, 75.1240],
  "MYS": [12.2958, 76.6394],

  // Tamil Nadu
  "MAS": [13.0827, 80.2707],
  "MS": [13.0012, 80.2565],
  "TPJ": [10.7905, 78.7047],
  "MDU": [9.9252, 78.1198],
  "CBE": [11.0168, 76.9558],
  "NCJ": [8.7139, 77.7567],

  // Kerala
  "TVC": [8.4855, 76.9492],
  "ERS": [9.9816, 76.2999],
  "CLT": [11.2588, 75.7804],
  "SRR": [10.9598, 75.9495],

  // Andhra Pradesh & Telangana
  "SC": [17.4339, 78.5000],
  "HYB": [17.3850, 78.4867],
  "BZA": [16.5193, 80.6305],
  "VSKP": [17.7231, 83.2985],
  "GNT": [16.3067, 80.4365],

  // Gujarat
  "ADI": [23.0225, 72.5714],
  "BRC": [22.3144, 73.1932],
  "ST": [21.1702, 72.8311],
  "RJT": [22.3039, 70.8022],

  // Madhya Pradesh
  "BPL": [23.2599, 77.4126],
  "JBP": [23.1815, 79.9864],
  "GWL": [26.2183, 78.1828],
  "INDB": [22.7196, 75.8577],
  "ET": [23.6611, 77.7631],

  // Rajasthan
  "JP": [26.9124, 75.7873],
  "AII": [26.4499, 74.6399],
  "JU": [26.2389, 73.0243],
  "BKN": [28.0229, 73.3119],
  "UDZ": [24.5713, 73.6915],

  // Odisha
  "BBS": [20.2961, 85.8189],
  "CTC": [20.4625, 85.8830],
  "PURI": [19.8135, 85.8312],

  // Assam & Northeast
  "GHY": [26.1445, 91.7362],
  "DBRG": [27.4728, 95.0152]
};

// Major Indian Rail Network Routes
const RAIL_NETWORKS = [
  ["NDLS", "ALJN", "CNB", "ALD", "BSB", "PNBE", "JSME", "DHN", "BWN", "HWH"],
  ["NDLS", "MTJ", "AGC", "GWL", "VGLJ", "BPL", "NGP", "BZA", "MAS"],
  ["BCT", "BRC", "ST", "ADI"],
  ["BCT", "PUNE", "SUR", "UBL", "SBC"],
  ["MAS", "MS", "SBC", "YPR"],
  ["HWH", "KGP", "CTC", "BBS", "VSKP", "BZA", "MAS"],
  ["ASR", "LDH", "UMB", "NDLS"],
  ["NDLS", "SRE", "HW", "DDN"]
];

const MAP_CENTER = [21.7679, 78.8718]; 

const createCustomMarker = (status, delay) => {
  let color = '#00f0ff'; // cyan
  if (status === 'cancelled' || delay > 60) {
    color = '#ff3366'; // red
  } else if (status === 'delayed' || delay > 15) {
    color = '#ffb300'; // warning yellow
  }

  return L.divIcon({
    html: `<div style="
      position: relative;
      width: 14px;
      height: 14px;
      background-color: ${color};
      border: 2px solid #080a0d;
      box-shadow: 0 0 8px ${color};
      cursor: pointer;
    "></div>`,
    className: 'custom-train-marker-wrapper',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

const createWarningIcon = () => {
  return L.divIcon({
    html: `<div style="
      position: relative;
      width: 24px;
      height: 24px;
      background-color: rgba(255, 51, 102, 0.2);
      border: 2px solid #ff3366;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      box-shadow: 0 0 12px #ff3366;
      animation: pulse-live 1.5s infinite;
      cursor: pointer;
    ">
      <span style="color: #ff3366; font-size: 14px; font-weight: 900; font-family: monospace;">!</span>
    </div>`,
    className: 'custom-warning-marker-wrapper',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

export default function LiveMap({ trains = [], incidents = [] }) {
  const activeTrains = trains?.length > 0 ? trains : [];

  // Generate polylines for regular rail network tracks
  const regularRoutes = RAIL_NETWORKS.map((route, rIdx) => {
    const coords = route
      .map(code => STATION_COORDS[code])
      .filter(coord => coord !== undefined);
    return (
      <Polyline 
        key={`reg-route-${rIdx}`} 
        positions={coords} 
        pathOptions={{ color: '#00f0ff', weight: 1.5, opacity: 0.15, dashArray: '4, 4' }} 
      />
    );
  });

  // Calculate and collect active blockages and Dijkstra detours
  const detourElements = [];
  const warningMarkers = [];

  incidents.forEach((inc, idx) => {
    // Check if incident is active/pending and has a train or station associated
    if (inc.resolution_status !== 'resolved' && inc.train_number) {
      // Find the associated train coordinates
      const matchingTrain = activeTrains.find(t => t.train_number === inc.train_number);
      let stationCode = inc.current_station || (matchingTrain && matchingTrain.current_station) || '';
      
      // Standardize station code
      if (stationCode.includes("Kanpur")) stationCode = "CNB";
      if (stationCode.includes("Delhi")) stationCode = "NDLS";
      if (stationCode.includes("Varanasi")) stationCode = "BSB";
      if (stationCode.includes("Bhopal") || stationCode.includes("RKMP")) stationCode = "BPL";
      if (stationCode.includes("Mathura")) stationCode = "MTJ";
      if (stationCode.includes("Allahabad") || stationCode.includes("Prayagraj")) stationCode = "ALD";

      const coords = STATION_COORDS[stationCode];
      if (coords) {
        const [lat, lng] = coords;

        // 1. Draw blocked track segment (dashed red crosshair line)
        detourElements.push(
          <Polyline
            key={`block-${inc.id}-${idx}`}
            positions={[
              [lat - 0.25, lng - 0.25],
              [lat + 0.25, lng + 0.25]
            ]}
            pathOptions={{ color: '#ff3366', weight: 3.5, opacity: 0.85, dashArray: '5, 5' }}
          />
        );

        // 2. Draw Dijkstra Detour bypass route (solid neon green polyline connecting path stations)
        if (inc.detour_route && inc.detour_route.length >= 2) {
          const detourPositions = inc.detour_route
            .map(code => STATION_COORDS[code])
            .filter(coord => coord !== undefined);
          if (detourPositions.length >= 2) {
            detourElements.push(
              <Polyline
                key={`detour-${inc.id}-${idx}`}
                positions={detourPositions}
                pathOptions={{ color: '#00e676', weight: 4.0, opacity: 0.95, lineJoin: 'round' }}
              />
            );
          }
        } else if (inc.reroute_plan && (inc.reroute_plan.toLowerCase().includes("detour") || inc.reroute_plan.toLowerCase().includes("bypass"))) {
          detourElements.push(
            <Polyline
              key={`detour-${inc.id}-${idx}`}
              positions={[
                [lat - 0.4, lng - 0.3],     // Detour start (West-South)
                [lat - 0.2, lng + 0.35],    // Detour mid arch (East bypass)
                [lat + 0.2, lng + 0.35],    // Detour mid arch
                [lat + 0.4, lng - 0.3]      // Detour rejoin (West-North)
              ]}
              pathOptions={{ color: '#00e676', weight: 3.5, opacity: 0.9, lineJoin: 'round' }}
            />
          );
        }

        // 3. Place warning triangle alert icon
        warningMarkers.push(
          <Marker 
            key={`warning-${inc.id}-${idx}`} 
            position={[lat, lng]} 
            icon={createWarningIcon()}
          >
            <Popup closeButton={false}>
              <div style={{
                padding: '10px',
                backgroundColor: '#0d1117',
                color: '#ff3366',
                fontFamily: "'JetBrains Mono', monospace",
                border: '1px solid #ff3366',
                fontSize: '11px'
              }}>
                <strong>⚠️ ACTIVE BLOCKAGE IN EFFECT</strong>
                <p style={{ color: '#8a9ba8', fontSize: '10px', margin: '4px 0 0 0' }}>
                  {inc.title}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      }
    }
  });

  return (
    <div style={{
      flex: 1,
      height: '100%',
      position: 'relative',
      backgroundColor: '#080a0d'
    }}>
      <MapContainer 
        center={MAP_CENTER} 
        zoom={5} 
        zoomControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        
        <ZoomControl position="bottomright" />

        {/* Regular tracks */}
        {regularRoutes}

        {/* Active Detours and Blockages */}
        {detourElements}

        {/* Warning Alert markers */}
        {warningMarkers}

        {/* Train markers */}
        {activeTrains.map((train, idx) => {
          let position;
          if (train.lat !== undefined && train.lng !== undefined) {
            position = [Number(train.lat), Number(train.lng)];
          } else {
            position = STATION_COORDS[train.current_station] || STATION_COORDS["NDLS"];
          }

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
              <Popup closeButton={false} minWidth={240}>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#121820',
                  color: '#e2e8f0',
                  fontFamily: "'JetBrains Mono', monospace",
                  borderRadius: '0px',
                  border: '1px solid #1a2433'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      backgroundColor: isDelayed ? 'rgba(255, 179, 0, 0.15)' : 'rgba(0, 240, 255, 0.15)',
                      color: isDelayed ? '#ffb300' : '#00f0ff',
                      padding: '2px 6px',
                      borderRadius: '0px',
                      border: `1px solid ${isDelayed ? '#ffb300' : '#00f0ff'}`,
                      letterSpacing: '0.5px'
                    }}>
                      {statusText}
                    </span>
                    <span style={{ fontSize: '10px', color: '#5c7080' }}>NO.{train.train_number}</span>
                  </div>

                  <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                    {train.train_name || 'Train Express'}
                  </h3>
                  <p style={{ fontSize: '10px', color: '#8a9ba8', marginBottom: '8px' }}>
                    ID: {train.train_id || `TN-${train.train_number}`} • VEL: {train.speed || '80 km/h'}
                  </p>

                  <div style={{ height: '1px', backgroundColor: '#1a2433', margin: '8px 0' }}></div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '10px',
                    fontWeight: 500
                  }}>
                    <span style={{ color: '#5c7080' }}>NEXT: <strong style={{ color: '#e2e8f0' }}>{train.next_station || 'MAS'}</strong></span>
                    <span style={{ color: '#00f0ff' }}>{train.distance_next || '0.5 KM'}</span>
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
