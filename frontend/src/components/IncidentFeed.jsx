/* eslint-disable */
import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Info, Check, CornerDownRight } from 'lucide-react';

export default function IncidentFeed({ incidents = [], onApprove, onAcknowledge }) {
  // Toggle expand state for details panels
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpand = (id) => {
    const next = new Set(expandedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedIds(next);
  };

  const getBorderColor = (severity = "info") => {
    switch (severity.toLowerCase()) {
      case 'critical': return '#ef4444'; // Red
      case 'high': return '#f43f5e'; // Rose
      case 'warning':
      case 'medium': return '#f59e0b'; // Yellow
      case 'info':
      case 'low': return '#3b82f6'; // Blue
      default: return '#1e293b';
    }
  };

  const getSeverityBadge = (severity = "info") => {
    let color = '#3b82f6';
    let bg = 'rgba(59, 130, 246, 0.1)';
    
    if (severity.toLowerCase() === 'critical') {
      color = '#ef4444';
      bg = 'rgba(239, 68, 68, 0.1)';
    } else if (severity.toLowerCase() === 'high') {
      color = '#f43f5e';
      bg = 'rgba(244, 63, 94, 0.1)';
    } else if (severity.toLowerCase() === 'warning' || severity.toLowerCase() === 'medium') {
      color = '#f59e0b';
      bg = 'rgba(245, 158, 11, 0.1)';
    } else if (severity.toLowerCase() === 'low') {
      color = '#10b981';
      bg = 'rgba(16, 185, 129, 0.1)';
    }

    return (
      <span style={{
        fontSize: '9px',
        fontWeight: 700,
        color: color,
        backgroundColor: bg,
        padding: '2px 6px',
        borderRadius: '3px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {severity}
      </span>
    );
  };

  // Header active count should count pending resolution_status
  const activeCount = incidents.filter(inc => inc.resolution_status === 'pending' || !inc.approved).length;

  return (
    <div style={{
      width: '320px',
      backgroundColor: '#11141a',
      borderLeft: '1px solid #1a1e26',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      flexShrink: 0
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #1a1e26',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', letterSpacing: '0.5px' }}>REAL-TIME INCIDENTS</h2>
          <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, letterSpacing: '0.5px' }}>PRIORITY SORTED FEED</span>
        </div>
        <span style={{
          fontSize: '9px',
          fontWeight: 700,
          color: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          padding: '2px 6px',
          borderRadius: '4px',
          letterSpacing: '0.5px'
        }}>
          {activeCount} ACTIVE
        </span>
      </div>

      {/* Feed list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {incidents.length === 0 ? (
          <div style={{
            padding: '20px',
            color: '#64748b',
            fontSize: '12px',
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            No recent incidents detected.
          </div>
        ) : (
          incidents.map((incident) => {
            const borderColor = getBorderColor(incident.severity);
            const isExpanded = expandedIds.has(incident.id);

            return (
              <div
                key={incident.id}
                style={{
                  backgroundColor: '#161920',
                  borderLeft: `4px solid ${borderColor}`,
                  borderRadius: '6px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a1e27'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#161920'}
              >
                {/* Card Header info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {getSeverityBadge(incident.severity)}
                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>{incident.timestamp}</span>
                </div>

                {/* Title & Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#fff', lineHeight: '1.3' }}>
                    {incident.incident_title || incident.title}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
                    "{incident.situation_summary || incident.description}"
                  </p>
                </div>

                {/* Reroute Plan action */}
                {incident.reroute_plan && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    border: '1px dashed rgba(59, 130, 246, 0.2)',
                    borderRadius: '4px',
                    padding: '8px 10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CornerDownRight size={13} style={{ color: '#3b82f6' }} />
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px' }}>REROUTE PLAN</span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: '#cbd5e1', lineHeight: '1.3' }}>
                      "{incident.reroute_plan}"
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  {incident.reroute_plan && (
                    <button
                      disabled={incident.approved}
                      onClick={() => onApprove && onApprove(incident.id)}
                      style={{
                        flex: 1,
                        backgroundColor: incident.approved ? 'rgba(16, 185, 129, 0.1)' : '#3b82f6',
                        color: incident.approved ? '#10b981' : '#fff',
                        border: incident.approved ? '1px solid rgba(16, 185, 129, 0.3)' : 'none',
                        borderRadius: '4px',
                        padding: '6px 0',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: incident.approved ? 'default' : 'pointer',
                        transition: 'background-color 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => {
                        if (!incident.approved) e.currentTarget.style.backgroundColor = '#2563eb';
                      }}
                      onMouseLeave={(e) => {
                        if (!incident.approved) e.currentTarget.style.backgroundColor = '#3b82f6';
                      }}
                    >
                      {incident.approved ? 'APPROVED ✓' : 'APPROVE'}
                    </button>
                  )}
                  <button
                    onClick={() => toggleExpand(incident.id)}
                    style={{
                      flex: 1,
                      backgroundColor: 'transparent',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      color: '#cbd5e1',
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '6px 0',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#1e293b';
                      e.currentTarget.style.borderColor = '#475569';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = '#334155';
                    }}
                  >
                    {isExpanded ? 'COLLAPSE ▲' : 'EXPAND ▼'}
                  </button>
                </div>

                {/* Expanded details panel */}
                {isExpanded && (
                  <div style={{
                    marginTop: '8px',
                    paddingTop: '10px',
                    borderTop: '1px dashed #334155',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    fontSize: '11px',
                    color: '#94a3b8',
                    animation: 'fadeIn 0.2s ease'
                  }}>
                    {incident.maintenance_task && (
                      <div>
                        <strong style={{ color: '#e2e8f0', display: 'block', marginBottom: '2px' }}>Maintenance Task:</strong>
                        {incident.maintenance_task}
                      </div>
                    )}
                    {incident.operations_task && (
                      <div>
                        <strong style={{ color: '#e2e8f0', display: 'block', marginBottom: '2px' }}>Operations Task:</strong>
                        {incident.operations_task}
                      </div>
                    )}
                    {incident.station_manager_task && (
                      <div>
                        <strong style={{ color: '#e2e8f0', display: 'block', marginBottom: '2px' }}>Station Manager:</strong>
                        {incident.station_manager_task}
                      </div>
                    )}
                    {incident.passenger_sms && (
                      <div>
                        <strong style={{ color: '#e2e8f0', display: 'block', marginBottom: '2px' }}>Passenger SMS:</strong>
                        <span style={{ fontStyle: 'italic', color: '#cbd5e1' }}>"{incident.passenger_sms}"</span>
                      </div>
                    )}
                    
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginTop: '6px',
                      paddingTop: '6px',
                      borderTop: '1px solid #1e293b'
                    }}>
                      {incident.departments && incident.departments.map((dept) => (
                        <span key={dept} style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: '3px',
                          padding: '2px 6px',
                          fontSize: '8px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {dept}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
