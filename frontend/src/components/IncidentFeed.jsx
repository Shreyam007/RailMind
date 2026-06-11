/* eslint-disable */
import React, { useState, useMemo } from 'react';
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
      case 'critical': return '#ff3366'; // Red
      case 'high': return '#ff3366';
      case 'warning':
      case 'medium': return '#ffb300'; // Yellow
      case 'info':
      case 'low': return '#00f0ff'; // Cyan
      default: return '#1a2433';
    }
  };

  const getSeverityBadge = (severity = "info") => {
    let color = '#00f0ff';
    let bg = 'rgba(0, 240, 255, 0.08)';
    
    if (severity.toLowerCase() === 'critical') {
      color = '#ff3366';
      bg = 'rgba(255, 51, 102, 0.08)';
    } else if (severity.toLowerCase() === 'high') {
      color = '#ff3366';
      bg = 'rgba(255, 51, 102, 0.08)';
    } else if (severity.toLowerCase() === 'warning' || severity.toLowerCase() === 'medium') {
      color = '#ffb300';
      bg = 'rgba(255, 179, 0, 0.08)';
    } else if (severity.toLowerCase() === 'low') {
      color = '#00e676';
      bg = 'rgba(0, 230, 118, 0.08)';
    }

    return (
      <span className="palantir-mono" style={{
        fontSize: '9px',
        fontWeight: 700,
        color: color,
        backgroundColor: bg,
        padding: '2px 6px',
        border: `1px solid ${color}`,
        borderRadius: '0px',
        textTransform: 'uppercase',
        letterSpacing: '1px'
      }}>
        // {severity}
      </span>
    );
  };

  // Header active count should count pending resolution_status
  const activeCount = useMemo(() => {
    return incidents.filter(inc => inc.resolution_status === 'pending' || !inc.approved).length;
  }, [incidents]);

  return (
    <div style={{
      width: '320px',
      backgroundColor: '#0d1117',
      borderLeft: '1px solid #1a2433',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      flexShrink: 0
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #1a2433',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h2 className="palantir-mono" style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', letterSpacing: '1px' }}>FEED // INCIDENTS</h2>
          <span className="palantir-mono" style={{ fontSize: '9px', color: '#5c7080', fontWeight: 600, letterSpacing: '0.5px' }}>REAL-TIME LOGSTREAM</span>
        </div>
        <span className="palantir-mono" style={{
          fontSize: '9px',
          fontWeight: 700,
          color: '#ff3366',
          border: '1px solid #ff3366',
          backgroundColor: 'rgba(255, 51, 102, 0.08)',
          padding: '2px 6px',
          borderRadius: '0px',
          letterSpacing: '1px'
        }}>
          [{activeCount} ACTIVE]
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
          <div className="palantir-mono" style={{
            padding: '20px',
            color: '#5c7080',
            fontSize: '11px',
            textAlign: 'center',
            letterSpacing: '0.5px'
          }}>
            [ NO ANOMALIES DETECTED ]
          </div>
        ) : (
          incidents.map((incident) => {
            const borderColor = getBorderColor(incident.severity);
            const isExpanded = expandedIds.has(incident.id);

            return (
              <div
                key={incident.id}
                style={{
                  backgroundColor: '#121820',
                  border: '1px solid #1a2433',
                  borderLeft: `4px solid ${borderColor}`,
                  borderRadius: '0px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#17202b';
                  e.currentTarget.style.borderColor = '#00f0ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#121820';
                  e.currentTarget.style.borderColor = '#1a2433';
                }}
              >
                {/* Card Header info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {getSeverityBadge(incident.severity)}
                  <span className="palantir-mono" style={{ fontSize: '10px', color: '#5c7080', fontWeight: 500 }}>{incident.timestamp}</span>
                </div>

                {/* Title & Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h3 className="palantir-mono" style={{ fontSize: '12px', fontWeight: 600, color: '#fff', lineHeight: '1.4' }}>
                    {incident.incident_title || incident.title}
                  </h3>
                  <p style={{ fontSize: '11px', color: '#8a9ba8', lineHeight: '1.5' }}>
                    {incident.situation_summary || incident.description}
                  </p>
                </div>

                {/* Reroute Plan action */}
                {incident.reroute_plan && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    backgroundColor: 'rgba(0, 240, 255, 0.03)',
                    border: '1px dashed #1a2433',
                    borderRadius: '0px',
                    padding: '8px 10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CornerDownRight size={13} style={{ color: '#00f0ff' }} />
                      <span className="palantir-mono" style={{ fontSize: '9px', fontWeight: 700, color: '#5c7080', letterSpacing: '0.5px' }}>REROUTE COMMAND</span>
                    </div>
                    <div className="palantir-mono" style={{ fontSize: '11px', fontWeight: 500, color: '#e2e8f0', lineHeight: '1.4' }}>
                      {incident.reroute_plan}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  {incident.reroute_plan && (
                    <button
                      disabled={incident.approved}
                      onClick={() => onApprove && onApprove(incident.id)}
                      className="palantir-mono"
                      style={{
                        flex: 1,
                        backgroundColor: incident.approved ? 'rgba(0, 230, 118, 0.08)' : '#00f0ff',
                        color: incident.approved ? '#00e676' : '#080a0d',
                        border: incident.approved ? '1px solid #00e676' : '1px solid #00f0ff',
                        borderRadius: '0px',
                        padding: '6px 0',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: incident.approved ? 'default' : 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => {
                        if (!incident.approved) {
                          e.currentTarget.style.backgroundColor = '#00d2c4';
                          e.currentTarget.style.borderColor = '#00d2c4';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!incident.approved) {
                          e.currentTarget.style.backgroundColor = '#00f0ff';
                          e.currentTarget.style.borderColor = '#00f0ff';
                        }
                      }}
                    >
                      {incident.approved ? 'APPROVED ✓' : 'APPROVE REROUTE'}
                    </button>
                  )}
                  <button
                    onClick={() => toggleExpand(incident.id)}
                    className="palantir-mono"
                    style={{
                      flex: 1,
                      backgroundColor: 'transparent',
                      border: '1px solid #1a2433',
                      borderRadius: '0px',
                      color: '#8a9ba8',
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
                      e.currentTarget.style.backgroundColor = '#17202b';
                      e.currentTarget.style.borderColor = '#00f0ff';
                      e.currentTarget.style.color = '#e2e8f0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = '#1a2433';
                      e.currentTarget.style.color = '#8a9ba8';
                    }}
                  >
                    {isExpanded ? 'COLLAPSE ▲' : 'EXPAND ▼'}
                  </button>
                </div>

                {/* Expanded details panel */}
                {isExpanded && (
                  <div className="palantir-mono" style={{
                    marginTop: '8px',
                    paddingTop: '10px',
                    borderTop: '1px dashed #1a2433',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    fontSize: '11px',
                    color: '#8a9ba8'
                  }}>
                    {incident.maintenance_task && (
                      <div>
                        <strong style={{ color: '#00f0ff', display: 'block', marginBottom: '2px' }}>MAINTENANCE ACTION:</strong>
                        {incident.maintenance_task}
                      </div>
                    )}
                    {incident.operations_task && (
                      <div>
                        <strong style={{ color: '#00f0ff', display: 'block', marginBottom: '2px' }}>OPERATIONS ACTION:</strong>
                        {incident.operations_task}
                      </div>
                    )}
                    {incident.station_manager_task && (
                      <div>
                        <strong style={{ color: '#00f0ff', display: 'block', marginBottom: '2px' }}>STATION ACTION:</strong>
                        {incident.station_manager_task}
                      </div>
                    )}
                    {incident.passenger_sms && (
                      <div>
                        <strong style={{ color: '#ffb300', display: 'block', marginBottom: '2px' }}>PASSENGER SMS ALERT:</strong>
                        <span style={{ color: '#e2e8f0' }}>"{incident.passenger_sms}"</span>
                      </div>
                    )}
                    
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginTop: '6px',
                      paddingTop: '6px',
                      borderTop: '1px solid #1a2433'
                    }}>
                      {incident.departments && incident.departments.map((dept) => (
                        <span key={dept} style={{
                          backgroundColor: 'rgba(0, 240, 255, 0.05)',
                          color: '#00f0ff',
                          border: '1px solid #00f0ff',
                          borderRadius: '0px',
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
