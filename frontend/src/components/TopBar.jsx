/* eslint-disable */
import React from 'react';
import { Bell, Settings } from 'lucide-react';

export default function TopBar({ loopCount = 0, incidentCount = 0, wsStatus = 'connected', onNotificationsClick, onSettingsClick, onProfileClick, activeTab = 'Dashboard', onTabChange }) {
  const tabs = ['Network', 'Telemetry', 'Schedules', 'Assets'];
  const activeTopTab = ['Telemetry', 'Schedules', 'Assets'].includes(activeTab) ? activeTab : 'Network';

  const isConnected = wsStatus === 'connected';

  return (
    <div style={{
      height: '64px',
      backgroundColor: '#0d1117',
      borderBottom: '1px solid #1a2433',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      flexShrink: 0
    }}>
      {/* Left section: Logo & Nav tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="palantir-mono" style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#00f0ff', 
            letterSpacing: '1px'
          }}>[ RAILMIND // CORE ]</span>
        </div>
        
        {/* Nav tabs */}
        <div style={{ display: 'flex', gap: '24px' }}>
          {tabs.map((tab) => {
            const isActive = tab === activeTopTab;
            return (
              <button
                key={tab}
                onClick={() => onTabChange && onTabChange(tab)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #00f0ff' : '2px solid transparent',
                  color: isActive ? '#00f0ff' : '#8a9ba8',
                  cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  height: '64px',
                  padding: '0 4px',
                  textTransform: 'uppercase',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right section: System state indicators & settings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        
        {/* Live and Counts indicators box */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#080a0d',
          border: '1px solid #1a2433',
          borderRadius: '2px',
          padding: '6px 14px',
          gap: '16px'
        }}>
          {/* LIVE/OFFLINE status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              className={isConnected ? "pulse-dot-cyan" : ""} 
              style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                backgroundColor: isConnected ? '#00f0ff' : '#ff3366',
                borderRadius: '50%'
              }}
            ></span>
            <span className="palantir-mono" style={{ 
              fontSize: '11px', 
              fontWeight: 600, 
              color: isConnected ? '#00f0ff' : '#ff3366', 
              letterSpacing: '0.5px' 
            }}>
              {isConnected ? 'SYS // ONLINE' : 'SYS // OFFLINE'}
            </span>
          </div>
          
          <div style={{ width: '1px', height: '14px', backgroundColor: '#1a2433' }}></div>

          {/* LOOP COUNT */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="palantir-mono" style={{ fontSize: '10px', fontWeight: 600, color: '#5c7080', letterSpacing: '0.5px' }}>RUNS:</span>
            <span className="palantir-mono" style={{ fontSize: '13px', fontWeight: 700, color: '#00f0ff' }}>[{loopCount}]</span>
          </div>

          <div style={{ width: '1px', height: '14px', backgroundColor: '#1a2433' }}></div>

          {/* INCIDENTS count */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="palantir-mono" style={{ fontSize: '10px', fontWeight: 600, color: '#5c7080', letterSpacing: '0.5px' }}>ANOMALIES:</span>
            <span className="palantir-mono" style={{ fontSize: '13px', fontWeight: 700, color: '#ff3366' }}>[{incidentCount}]</span>
          </div>
        </div>

        {/* Bell notification */}
        <button 
          onClick={onNotificationsClick}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#8a9ba8',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s'
          }} onMouseEnter={(e) => e.currentTarget.style.color = '#00f0ff'} onMouseLeave={(e) => e.currentTarget.style.color = '#8a9ba8'}>
          <Bell size={18} />
        </button>

        {/* Settings */}
        <button 
          onClick={onSettingsClick}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#8a9ba8',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s'
          }} onMouseEnter={(e) => e.currentTarget.style.color = '#00f0ff'} onMouseLeave={(e) => e.currentTarget.style.color = '#8a9ba8'}>
          <Settings size={18} />
        </button>

        {/* Profile Avatar */}
        <div 
          onClick={onProfileClick}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '2px',
            overflow: 'hidden',
            border: '1px solid #1a2433',
            cursor: 'pointer'
          }}>
          <img 
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" 
            alt="User profile" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

      </div>
    </div>
  );
}
