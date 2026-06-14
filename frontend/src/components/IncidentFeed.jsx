/* eslint-disable */
import React, { useState, useMemo } from 'react';
import { CornerDownRight } from 'lucide-react';

export default function IncidentFeed({ incidents = [], onApprove, onAcknowledge }) {
  // Toggle expand state for details panels
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [logExport, setLogExport] = useState(false);

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
      case 'critical': return '#ff3366';
      case 'high': return '#ff3366';
      case 'warning':
      case 'medium': return '#ffb300';
      default: return '#00f0ff';
    }
  };

  // Header active count should count pending resolution_status
  const activeCount = incidents.filter(inc => inc.resolution_status === 'pending' || !inc.approved).length;

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
          <h2 className="palantir-mono" style={{ fontSize: '11px', fontWeight: 600, color: '#e2e8f0', letterSpacing: '1px' }}>FEED // INCIDENTS</h2>
        </div>
        <button style={{ backgroundColor: 'transparent', border: 'none', color: '#5c7080', cursor: 'pointer' }}>
          <span style={{ fontSize: '14px', fontWeight: 700 }}>•••</span>
        </button>
      </div>

      {/* Feed list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {incidents.length === 0 ? (
          <div className="palantir-mono" style={{
            color: '#5c7080',
            fontSize: '11px',
            lineHeight: '1.6'
          }}>
            [14:45:32] <span style={{ color: '#00e676' }}>SYSTEM:</span> Network health check completed. Status: OPTIMAL.
          </div>
        ) : (
          incidents.map((incident) => {
            const isCritical = incident.severity?.toLowerCase() === 'critical';
            const isWarning = incident.severity?.toLowerCase() === 'warning' || incident.severity?.toLowerCase() === 'medium';
            const category = isCritical ? 'AI-ALERT' : isWarning ? 'AI-ANOMALY' : 'SYSTEM';
            const categoryColor = isCritical ? '#ff3366' : isWarning ? '#ffb300' : '#00e676';
            const isExpanded = expandedIds.has(incident.id);

            return (
              <div 
                key={incident.id} 
                style={{ display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }}
                onClick={() => toggleExpand(incident.id)}
              >
                <div className="palantir-mono" style={{
                  fontSize: '11px',
                  lineHeight: '1.5',
                  color: '#cbd5e1'
                }}>
                  <span style={{ color: '#5c7080', marginRight: '4px' }}>[{incident.timestamp || '14:45:00'}]</span>
                  <span style={{ color: categoryColor, fontWeight: 700, marginRight: '4px' }}>{category}:</span>
                  {incident.incident_title || incident.title}. {incident.situation_summary || incident.description}
                </div>

                {isExpanded && (
                  <div className="palantir-mono" style={{
                    padding: '8px 12px',
                    backgroundColor: '#121820',
                    border: '1px solid #1a2433',
                    fontSize: '10px',
                    color: '#8a9ba8',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    {incident.reroute_plan && (
                      <div>
                        <span style={{ color: '#00f0ff', fontWeight: 600 }}>REROUTE COMMAND:</span> {incident.reroute_plan}
                        {incident.approved ? (
                          <span className="palantir-mono" style={{ color: '#00e676', marginLeft: '8px', fontWeight: 700 }}>Approved</span>
                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); onApprove && onApprove(incident.id); }}
                            className="palantir-mono"
                            style={{
                              marginLeft: '8px',
                              padding: '2px 8px',
                              backgroundColor: '#00f0ff',
                              border: 'none',
                              color: '#080a0d',
                              fontSize: '9px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Approve Route Change
                          </button>
                        )}
                      </div>
                    )}
                    {incident.maintenance_task && <div><span style={{ color: '#00f0ff' }}>MAINTENANCE:</span> {incident.maintenance_task}</div>}
                    {incident.operations_task && <div><span style={{ color: '#00f0ff' }}>OPERATIONS:</span> {incident.operations_task}</div>}
                    {incident.station_manager_task && <div><span style={{ color: '#00f0ff' }}>STATION:</span> {incident.station_manager_task}</div>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Filter & Export Toggle */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #1a2433',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#0a0c10'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <span className="palantir-mono" style={{ fontSize: '10px', color: '#8a9ba8', fontWeight: 600 }}>Filters</span>
          <svg style={{ width: '10px', height: '10px', color: '#8a9ba8' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M19 9l-7 7-7-7" /></svg>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="palantir-mono" style={{ fontSize: '10px', color: '#5c7080', fontWeight: 600 }}>Log export</span>
          <label style={{ position: 'relative', display: 'inline-block', width: '28px', height: '16px' }}>
            <input 
              type="checkbox" 
              checked={logExport}
              onChange={(e) => setLogExport(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }} 
            />
            <span style={{
              position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: logExport ? '#00e676' : '#1a2433', transition: '.2s', borderRadius: '8px'
            }}>
              <span style={{
                position: 'absolute', content: '""', height: '10px', width: '10px', left: logExport ? '15px' : '3px', bottom: '3px',
                backgroundColor: logExport ? '#080a0d' : '#8a9ba8', transition: '.2s', borderRadius: '50%'
              }} />
            </span>
          </label>
        </div>
      </div>

    </div>
  );
}
