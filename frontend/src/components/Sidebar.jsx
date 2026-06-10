/* eslint-disable */
import React from 'react';
import { LayoutDashboard, Map, BellRing, ClipboardList, BarChart3, HelpCircle, FileClock } from 'lucide-react';

export default function Sidebar({ activeTab = 'Dashboard', setActiveTab }) {
  const menuItems = [
    { id: 'Dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'Live Map', name: 'Live Map', icon: Map },
    { id: 'Incident Feed', name: 'Incident Feed', icon: BellRing },
    { id: 'Task Board', name: 'Task Board', icon: ClipboardList },
    { id: 'Analytics', name: 'Analytics', icon: BarChart3 }
  ];

  const bottomItems = [
    { id: 'Support', name: 'SUPPORT', icon: HelpCircle },
    { id: 'Logs', name: 'LOGS', icon: FileClock }
  ];

  return (
    <div style={{
      width: '240px',
      backgroundColor: '#11141a',
      borderRight: '1px solid #1a1e26',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '100%',
      padding: '24px 0 16px 0',
      flexShrink: 0
    }}>
      <div>
        {/* Header */}
        <div style={{ padding: '0 24px 24px 24px', borderBottom: '1px solid #1a1e26' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', letterSpacing: '-0.5px' }}>System Alpha</h2>
          <span style={{ fontSize: '11px', color: '#5f759e', fontWeight: 500 }}>Vigilance Active</span>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '24px 12px 0 12px' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab && setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: isActive ? '#1c202a' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: isActive ? '#f8fafc' : '#cbd5e1',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#151821';
                    e.currentTarget.style.color = '#cbd5e1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#cbd5e1';
                  }
                }}
              >
                <Icon size={18} style={{ color: isActive ? '#3b82f6' : '#64748b' }} />
                {item.name}
              </button>
            );
          })}
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                backgroundColor: isActive ? '#1c202a' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: '#94a3b8',
                fontFamily: 'inherit',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.5px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#151821';
                e.currentTarget.style.color = '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              <Icon size={15} style={{ color: '#64748b' }} />
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
