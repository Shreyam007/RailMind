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
      backgroundColor: '#11141a',
      borderBottom: '1px solid #1a1e26',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      flexShrink: 0
    }}>
      {/* Left section: Logo & Nav tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#a5b4fc', 
            letterSpacing: '-0.75px'
          }}>RailMind</span>
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
                  borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                  color: isActive ? '#f8fafc' : '#94a3b8',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '15px',
                  fontWeight: isActive ? 600 : 500,
                  height: '64px',
                  padding: '0 4px',
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
          backgroundColor: '#0a0c10',
          border: '1px solid #1e293b',
          borderRadius: '6px',
          padding: '6px 14px',
          gap: '16px'
        }}>
          {/* LIVE/OFFLINE status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              className={isConnected ? "pulse-dot-green" : ""} 
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                backgroundColor: isConnected ? '#10b981' : '#ef4444',
                borderRadius: '50%'
              }}
            ></span>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 600, 
              color: isConnected ? '#10b981' : '#ef4444', 
              letterSpacing: '0.5px' 
            }}>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
          
          <div style={{ width: '1px', height: '14px', backgroundColor: '#1e293b' }}></div>

          {/* LOOP COUNT */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '9px', fontWeight: 600, color: '#64748b', letterSpacing: '0.5px' }}>LOOP COUNT</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#3b82f6' }}>{loopCount}</span>
          </div>

          <div style={{ width: '1px', height: '14px', backgroundColor: '#1e293b' }}></div>

          {/* INCIDENTS count */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '9px', fontWeight: 600, color: '#64748b', letterSpacing: '0.5px' }}>INCIDENTS</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>{incidentCount}</span>
          </div>
        </div>

        {/* Bell notification */}
        <button 
          onClick={onNotificationsClick}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#cbd5e1',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s'
          }} onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = '#cbd5e1'}>
          <Bell size={20} />
        </button>

        {/* Settings */}
        <button 
          onClick={onSettingsClick}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#cbd5e1',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s'
          }} onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = '#cbd5e1'}>
          <Settings size={20} />
        </button>

        {/* Profile Avatar */}
        <div 
          onClick={onProfileClick}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '1px solid #3b82f6',
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
