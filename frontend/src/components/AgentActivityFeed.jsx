/* eslint-disable */
import React, { useEffect, useRef } from 'react';
import { Activity, Clock, Terminal } from 'lucide-react';

export default function AgentActivityFeed({ logs = [] }) {
  const feedEndRef = useRef(null);

  useEffect(() => {
    if (feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div style={{
      width: '320px',
      backgroundColor: '#0a0c10',
      borderLeft: '1px solid #1a1e26',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      flexShrink: 0
    }}>
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #1a1e26',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <Activity size={18} style={{ color: '#10b981' }} />
        <div>
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', letterSpacing: '0.5px' }}>AGENT ACTIVITY FEED</h2>
          <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, letterSpacing: '0.5px' }}>LIVE AUTONOMOUS LOGS</span>
        </div>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {logs.length === 0 ? (
          <div style={{ padding: '20px', color: '#64748b', fontSize: '12px', textAlign: 'center', fontStyle: 'italic' }}>
            Awaiting agent telemetry...
          </div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} style={{
              backgroundColor: '#11141a',
              border: '1px solid #1e293b',
              borderRadius: '6px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              animation: 'fadeIn 0.3s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>
                  {log.agent || 'Agent'}
                </span>
                <span style={{ fontSize: '9px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={10} />
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <Terminal size={12} style={{ marginTop: '2px', color: '#10b981', flexShrink: 0 }} />
                <span>{log.action}</span>
              </div>

              {log.reasoning && (
                <div style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  padding: '6px 8px',
                  backgroundColor: '#0a0c10',
                  borderRadius: '4px',
                  borderLeft: '2px solid #334155'
                }}>
                  {log.reasoning}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={feedEndRef} />
      </div>
    </div>
  );
}
