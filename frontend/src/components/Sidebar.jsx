/* eslint-disable */
import React, { useState } from 'react';
import { LayoutDashboard, Map, BellRing, ClipboardList, BarChart3, HelpCircle, FileClock, Play, Radio } from 'lucide-react';

export default function Sidebar({ activeTab = 'Dashboard', setActiveTab, agentState = 'IDLE' }) {
  const menuItems = [
    { id: 'Dashboard', name: 'DASHBOARD', icon: LayoutDashboard },
    { id: 'Live Map', name: 'LIVE MAP', icon: Map },
    { id: 'Incident Feed', name: 'INCIDENT FEED', icon: BellRing },
    { id: 'Task Board', name: 'TASK BOARD', icon: ClipboardList },
    { id: 'Analytics', name: 'ANALYTICS', icon: BarChart3 }
  ];

  const bottomItems = [
    { id: 'Support', name: 'SUPPORT // HELP', icon: HelpCircle },
    { id: 'Logs', name: 'SYSTEM LOGS', icon: FileClock }
  ];

  const [simulating, setSimulating] = useState(false);

  const handleSimulate = async (type) => {
    if (simulating) return;
    setSimulating(true);
    
    let trainNumber = "12301";
    let location = "Kanpur Central";
    let delayMinutes = 90;
    let severity = "critical";

    if (type === 'fog') {
      trainNumber = "12002";
      location = "New Delhi";
      delayMinutes = 45;
      severity = "warning";
    } else if (type === 'landslide') {
      trainNumber = "12260";
      location = "Varanasi";
      delayMinutes = 150;
      severity = "critical";
    } else if (type === 'overcrowding') {
      trainNumber = "12952";
      location = "Bhopal";
      delayMinutes = 20;
      severity = "high";
    } else if (type === 'cancellation') {
      trainNumber = "12309";
      location = "Patna";
      delayMinutes = 0;
      severity = "critical";
    } else if (type === 'conflict') {
      trainNumber = "12301";
      location = "Prayagraj";
      delayMinutes = 60;
      severity = "high";
    }

    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/simulate-anomaly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          train_number: trainNumber,
          anomaly_type: type,
          location: location,
          delay_minutes: delayMinutes,
          severity: severity
        })
      });
      if (!res.ok) {
        console.error("Failed to inject simulation");
      }
    } catch (err) {
      console.error("Simulation trigger failed:", err);
    } finally {
      setTimeout(() => setSimulating(false), 2000);
    }
  };

  // Agent HUD mapping
  const HUD_STAGES = [
    { id: 'ingest_node', label: 'TELEMETRY INGESTION' },
    { id: 'detect_node', label: 'ANOMALY DETECTOR' },
    { id: 'reason_node', label: 'AI REASONING' },
    { id: 'reroute_node', label: 'SHORT-PATH DETOUR' },
    { id: 'coordination_node', label: 'DEPT DISPATCHER' },
    { id: 'alert_node', label: 'TWILIO OUTBOX' },
    { id: 'report_node', label: 'BROADCAST REPORT' }
  ];

  return (
    <div style={{
      width: '260px',
      backgroundColor: '#0d1117',
      borderRight: '1px solid #1a2433',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '100%',
      padding: '16px 0 12px 0',
      flexShrink: 0,
      overflowY: 'auto'
    }}>
      <div>
        {/* Header */}
        <div style={{ padding: '0 20px 14px 20px', borderBottom: '1px solid #1a2433' }}>
          <h2 className="palantir-mono" style={{ fontSize: '15px', fontWeight: 600, color: '#e2e8f0', letterSpacing: '1px' }}>SYS // ALPHA</h2>
          <span className="palantir-mono" style={{ fontSize: '10px', color: '#00f0ff', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Radio size={10} style={{ animation: 'pulse-live 1s infinite' }} />
            VIGILANCE // ACTIVE
          </span>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '10px 12px', borderBottom: '1px solid #1a2433' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab && setActiveTab(item.id)}
                className="palantir-mono"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 16px',
                  backgroundColor: isActive ? '#121820' : 'transparent',
                  border: 'none',
                  borderLeft: isActive ? '3px solid #00f0ff' : '3px solid transparent',
                  borderRadius: '0px',
                  color: isActive ? '#00f0ff' : '#8a9ba8',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  width: '100%'
                }}
              >
                <Icon size={14} style={{ color: isActive ? '#00f0ff' : '#5c7080' }} />
                {item.name}
              </button>
            );
          })}
        </div>

        {/* Live Agent HUD */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #1a2433' }}>
          <h3 className="palantir-mono" style={{ fontSize: '10px', fontWeight: 700, color: '#6f8495', letterSpacing: '1.5px', marginBottom: '10px' }}>
            COGNITIVE AGENT HUD
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {HUD_STAGES.map(stage => {
              const isActive = agentState === stage.id;
              return (
                <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    backgroundColor: isActive ? '#00e676' : '#2d3748',
                    borderRadius: '50%',
                    boxShadow: isActive ? '0 0 6px #00e676' : 'none',
                    animation: isActive ? 'pulse-live 1s infinite' : 'none'
                  }}></span>
                  <span className="palantir-mono" style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: isActive ? '#00e676' : '#5c7080',
                    letterSpacing: '0.5px'
                  }}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
            <div style={{ 
              marginTop: '6px',
              padding: '6px 10px', 
              border: '1px solid #1a2433', 
              backgroundColor: '#0a0d14', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px' 
            }}>
              <span className="palantir-mono" style={{ fontSize: '10px', color: '#8a9ba8' }}>STATE:</span>
              <span className="palantir-mono" style={{ 
                fontSize: '10px',
                fontWeight: 700, 
                color: agentState === 'IDLE' ? '#5c7080' : '#00f0ff' 
              }}>
                [ {agentState.toUpperCase()} ]
              </span>
            </div>
          </div>
        </div>

        {/* Tactical Simulation Panel */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #1a2433' }}>
          <h3 className="palantir-mono" style={{ fontSize: '10px', fontWeight: 700, color: '#6f8495', letterSpacing: '1.5px', marginBottom: '10px' }}>
            TACTICAL SIMULATION PANEL
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={() => handleSimulate('signal_failure')}
              disabled={simulating}
              className="palantir-mono"
              style={{
                width: '100%',
                padding: '6px 12px',
                fontSize: '10px',
                fontWeight: 700,
                backgroundColor: 'rgba(255, 179, 0, 0.04)',
                border: '1px solid rgba(255, 179, 0, 0.3)',
                color: '#ffb300',
                cursor: simulating ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Play size={10} /> SIGNAL FAILURE (CNB)
            </button>
            <button
              onClick={() => handleSimulate('fog')}
              disabled={simulating}
              className="palantir-mono"
              style={{
                width: '100%',
                padding: '6px 12px',
                fontSize: '9px',
                fontWeight: 700,
                backgroundColor: 'rgba(0, 240, 255, 0.04)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                color: '#00f0ff',
                cursor: simulating ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Play size={10} /> DENSE FOG ALERT (NDLS)
            </button>
            <button
              onClick={() => handleSimulate('landslide')}
              disabled={simulating}
              className="palantir-mono"
              style={{
                width: '100%',
                padding: '6px 12px',
                fontSize: '9px',
                fontWeight: 700,
                backgroundColor: 'rgba(255, 51, 102, 0.04)',
                border: '1px solid rgba(255, 51, 102, 0.3)',
                color: '#ff3366',
                cursor: simulating ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Play size={10} /> LANDSLIDE DETOUR (BSB)
            </button>
            <button
              onClick={() => handleSimulate('overcrowding')}
              disabled={simulating}
              className="palantir-mono"
              style={{
                width: '100%',
                padding: '6px 12px',
                fontSize: '9px',
                fontWeight: 700,
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#f8fafc',
                cursor: simulating ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Play size={10} /> OVERCROWD WAIT (BPL)
            </button>
            <button
              onClick={() => handleSimulate('conflict')}
              disabled={simulating}
              className="palantir-mono"
              style={{
                width: '100%',
                padding: '6px 12px',
                fontSize: '9px',
                fontWeight: 700,
                backgroundColor: 'rgba(0, 230, 118, 0.04)',
                border: '1px solid rgba(0, 230, 118, 0.3)',
                color: '#00e676',
                cursor: simulating ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Play size={10} /> SELF-HEAL CONFLICT (ALD)
            </button>
          </div>
        </div>

      </div>

      {/* Footer Nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 12px' }}>
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab && setActiveTab(item.id)}
              className="palantir-mono"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 16px',
                backgroundColor: isActive ? '#121820' : 'transparent',
                border: 'none',
                borderLeft: isActive ? '3px solid #00f0ff' : '3px solid transparent',
                borderRadius: '0px',
                color: isActive ? '#00f0ff' : '#5c7080',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.5px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                width: '100%'
              }}
            >
              <Icon size={12} style={{ color: '#5c7080' }} />
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
