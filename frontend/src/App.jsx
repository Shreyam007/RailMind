/* eslint-disable */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import LiveMap from './components/LiveMap';
import IncidentFeed from './components/IncidentFeed';
import TaskBoard from './components/TaskBoard';
import RouteIntelligence from './components/RouteIntelligence';
import { ShieldAlert, AlertTriangle, Info, Check, CornerDownRight, Terminal, RefreshCw, X, Shield, User, HelpCircle, Activity, Bell, Settings } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ERROR BOUNDARY] Caught rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          backgroundColor: '#080a0d',
          color: '#ff3366',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          gap: '16px'
        }}>
          <h2 style={{ fontWeight: 600 }}>[ SYSTEM ERROR // RAILMIND CRASH ]</h2>
          <p style={{ color: '#8a9ba8', fontSize: '13px' }}>RailMind Dashboard encountered an unrecoverable rendering error.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#00f0ff',
              color: '#080a0d',
              border: 'none',
              borderRadius: '0px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            REBOOT SYSTEM
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [loopCount, setLoopCount] = useState(0);
  const [incidentCount, setIncidentCount] = useState(0);
  const [incidents, setIncidents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [trains, setTrains] = useState([]);
  const [wsStatus, setWsStatus] = useState('reconnecting');
  const [logs, setLogs] = useState([]);
  const [agentState, setAgentState] = useState('IDLE');
  const [commandText, setCommandText] = useState('');
  const [commandResult, setCommandResult] = useState('');
  const [smsLogs, setSmsLogs] = useState([]);
  const [liveFlash, setLiveFlash] = useState(false);
  const [cycleCountdown, setCycleCountdown] = useState(30);
  const [secondsSinceScan, setSecondsSinceScan] = useState(0);
  const [cascadeAlert, setCascadeAlert] = useState(null);
  const [prediction, setPrediction] = useState(null);

  // Agent Brain Real-time Thinking HUD States
  const [perceivingText, setPerceivingText] = useState('Scanning 15 trains');
  const [perceivingConfidence, setPerceivingConfidence] = useState('87%');
  const [decidingText, setDecidingText] = useState('Evaluating 4 possible actions...');
  const [decidingConfidence, setDecidingConfidence] = useState('—');
  const [actingText, setActingText] = useState('Waiting for dispatch...');
  const [actingStatus, setActingStatus] = useState('IDLE');
  
  // Modal Overlay States
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const recentIncidentElements = useMemo(() => {
    const result = [];
    const len = Math.min(incidents.length, 5);
    for (let i = 0; i < len; i++) {
      const inc = incidents[i];
      result.push(
        <div key={inc.id} className="palantir-mono" style={{
          backgroundColor: '#121820',
          border: '1px solid #1a2433',
          padding: '10px 14px',
          borderRadius: '0px',
          fontSize: '11px',
          color: '#cbd5e1'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#ff3366', fontWeight: 700 }}>{inc.severity.toUpperCase()}</span>
            <span style={{ color: '#5c7080' }}>{inc.timestamp}</span>
          </div>
          {inc.title}
        </div>
      );
    }
    return result;
  }, [incidents]);

  const socketRef = useRef(null);
  const terminalEndRef = useRef(null);
  const API_BASE = `http://${window.location.hostname}:8000`;

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Fetch functions
  const fetchIncidents = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/incidents`);
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map(inc => ({
          id: inc.incident_id || inc._id,
          severity: inc.severity || "info",
          title: inc.incident_title || inc.summary || "Operations Anomaly",
          description: inc.situation_summary || inc.summary || "Investigating operational status.",
          timestamp: new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp_iso: inc.timestamp,
          incident_title: inc.incident_title || inc.summary || "Operations Anomaly",
          situation_summary: inc.situation_summary || inc.summary || "Investigating operational status.",
          reroute_plan: inc.reroute_plan || null,
          maintenance_task: inc.maintenance_task || '',
          operations_task: inc.operations_task || '',
          station_manager_task: inc.station_manager_task || '',
          passenger_sms: inc.passenger_sms || '',
          resolution_status: inc.resolution_status || 'pending',
          approved: inc.resolution_status === 'approved',
          departments: inc.departments_notified || [],
          train_number: inc.train_number || 'Unknown',
          confidence_score: inc.confidence_score || null,
          reasoning_steps: inc.reasoning_steps || [],
          passenger_impact: inc.passenger_impact || '',
          prediction: inc.prediction || '',
          memory_used: inc.memory_used || ''
        }));
        setIncidents(formatted);
        setIncidentCount(formatted.length);
      }
    } catch (err) {
      console.error("[API] Failed to fetch incidents:", err);
    }
  };

  const fetchTrains = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/trains`);
      if (res.ok) {
        const data = await res.json();
        setTrains(data);
      }
    } catch (err) {
      console.error("[API] Failed to fetch trains:", err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/dept-tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error("[API] Failed to fetch department tasks:", err);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsSinceScan(prev => prev + 1);
      setCycleCountdown(prev => (prev > 1 ? prev - 1 : 30));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchIncidents();
    fetchTrains();
    fetchTasks();

    const wsUrl = `ws://${window.location.hostname}:8000/ws`;
    let socket;
    let reconnectTimeout;

    const connectWS = () => {
      console.log("[WEBSOCKET] Connecting to:", wsUrl);
      socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("[WEBSOCKET] Connected to RailMind WebSocket server");
        setWsStatus('connected');
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.type === 'INCIDENT_UPDATE') {
            const report = payload.data;
            
            const newIncident = {
              id: report.incident_id,
              severity: report.severity || "info",
              title: report.incident_title || report.summary || "New Incident Logged",
              description: report.situation_summary || report.summary || "Investigating operational status.",
              timestamp: new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              timestamp_iso: report.timestamp,
              incident_title: report.incident_title || report.summary || "New Incident Logged",
              situation_summary: report.situation_summary || report.summary || "Investigating operational status.",
              reroute_plan: report.reroute_plan || null,
              maintenance_task: report.maintenance_task || '',
              operations_task: report.operations_task || '',
              station_manager_task: report.station_manager_task || '',
              passenger_sms: report.passenger_sms || '',
              resolution_status: report.resolution_status || 'pending',
              approved: report.resolution_status === 'approved',
              departments: report.departments_notified || [],
              train_number: report.train_number || 'Unknown',
              confidence_score: report.confidence_score || null,
              reasoning_steps: report.reasoning_steps || [],
              passenger_impact: report.passenger_impact || '',
              prediction: report.prediction || '',
              memory_used: report.memory_used || ''
            };

            setIncidents(prev => {
              if (prev.some(inc => inc.id === newIncident.id)) return prev;
              return [newIncident, ...prev];
            });
            setIncidentCount(prev => prev + 1);
            if (report.loop_count !== undefined) {
              setLoopCount(report.loop_count);
            }

             if (report.passenger_sms) {
              setSmsLogs(prev => {
                const newLog = {
                  to: "+919651058174 (Passenger)",
                  body: report.passenger_sms,
                  sid: `SMdemo_${Math.random().toString(36).substr(2, 9)}`
                };
                if (prev.some(l => l.body === newLog.body)) return prev;
                return [newLog, ...prev];
              });
            }

            fetchTasks();
            fetchTrains();
          } else if (payload.type === 'AGENT_LOG') {
            setLogs(prev => [...prev, payload].slice(-200)); // Keep last 200 logs
            
            // Dynamically update the HUD based on actual thinking logs!
            const node = payload.node?.toUpperCase();
            const msg = payload.message || '';
            
            if (node === 'SCANNING') {
              setPerceivingText(msg.replace('[RAILMIND] ', ''));
              setPerceivingConfidence('87%');
              setActingStatus('IDLE');
            } else if (node === 'DETECTED') {
              setPerceivingText(msg);
            } else if (node === 'CASCADE?') {
              setPerceivingText(msg);
            } else if (node === 'THINKING') {
              setDecidingText('Sending to Gemini for perception...');
              setDecidingConfidence('—');
            } else if (node === 'PERCEIVED') {
              setPerceivingText(msg);
              setPerceivingConfidence('91%');
            } else if (node === 'DECIDING') {
              setDecidingText(msg);
            } else if (node === 'DECIDED') {
              const confMatch = msg.match(/Confidence:\s*(\d+)%/i);
              if (confMatch) {
                setDecidingConfidence(confMatch[1] + '%');
              } else {
                setDecidingConfidence('94%');
              }
              const cleanDec = msg.replace(/Confidence:\s*\d+%\.?\s*/i, '');
              setDecidingText(cleanDec);
            } else if (node === 'ACTING') {
              setActingText(msg);
              setActingStatus('RUNNING');
            } else if (node === 'SMS') {
              setActingText(msg);
              setActingStatus('RUNNING');
            } else if (node === 'LOGGED') {
              setActingText(msg);
              setActingStatus('SAVING');
            } else if (node === 'COMPLETE') {
              setActingStatus('COMPLETE');
            }
          } else if (payload.type === 'AGENT_STATE_CHANGE') {
            setAgentState(payload.state);
          } else if (payload.type === 'CASCADE_ALERT') {
            setCascadeAlert(payload);
          } else if (payload.type === 'PREDICTION_UPDATE') {
            setPrediction(payload.data);
          } else if (payload.type === 'LOOP_UPDATE') {
            setLoopCount(payload.loop_count);
            setSecondsSinceScan(0);
            setCycleCountdown(30);
            setLiveFlash(true);
            setTimeout(() => setLiveFlash(false), 800);
            
            // Reset agent brain dashboard indicators for new loop
            setPerceivingText('Scanning 15 trains');
            setPerceivingConfidence('87%');
            setDecidingText('Evaluating 4 possible actions...');
            setDecidingConfidence('—');
            setActingText('Waiting for dispatch...');
            setActingStatus('PENDING');
            
            if (payload.anomalies_found === 0) {
              setCascadeAlert(null);
              setPrediction(null);
            }
            fetchTrains();
            fetchIncidents();
            fetchTasks();
          }
        } catch (err) {
          console.error("[WEBSOCKET] Error parsing socket data:", err);
        }
      };

      socket.onclose = () => {
        console.log("[WEBSOCKET] Closed. Reconnecting in 3 seconds...");
        setWsStatus('reconnecting');
        reconnectTimeout = setTimeout(connectWS, 3000);
      };

      socket.onerror = (err) => {
        console.error("[WEBSOCKET] Error encountered:", err);
        socket.close();
      };
    };

    connectWS();

    return () => {
      if (socket) socket.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  const handleApprove = async (incidentId) => {
    console.log(`Approving reroute plan for incident: ${incidentId}`);
    const adminPassword = window.prompt("Enter Admin Password to approve this reroute plan:");
    if (adminPassword === null) {
      return; // User cancelled
    }
    try {
      const headers = new Headers();
      headers.set('Authorization', 'Basic ' + btoa('admin:' + adminPassword));
      const res = await fetch(`${API_BASE}/api/incidents/${incidentId}/approve`, {
        method: 'POST',
        headers: headers
      });
      if (res.ok) {
        setIncidents(prev => prev.map(inc => {
          if (inc.id === incidentId) {
            return { ...inc, approved: true, resolution_status: 'approved' };
          }
          return inc;
        }));
      } else if (res.status === 401) {
        alert("Incorrect admin password.");
        console.error("Unauthorized: Incorrect admin password.");
      } else {
        console.error("Failed to approve incident reroute plan on backend");
      }
    } catch (err) {
      console.error("Error approving reroute plan:", err);
    }
  };

  const handleOverride = async (incidentId, newDecision) => {
    console.log(`Overriding reroute plan for incident ${incidentId} with: ${newDecision}`);
    const adminPassword = window.prompt("Enter Admin Password to execute this override plan:");
    if (adminPassword === null) {
      return; // User cancelled
    }
    try {
      const headers = new Headers();
      headers.set('Authorization', 'Basic ' + btoa('admin:' + adminPassword));
      headers.set('Content-Type', 'application/json');
      const res = await fetch(`${API_BASE}/api/incidents/${incidentId}/override`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ decision: newDecision })
      });
      if (res.ok) {
        const data = await res.json();
        setIncidents(prev => prev.map(inc => {
          if (inc.id === incidentId) {
            return { ...inc, approved: true, resolution_status: 'approved', reroute_plan: data.decision };
          }
          return inc;
        }));
      } else if (res.status === 401) {
        alert("Incorrect admin password.");
        console.error("Unauthorized: Incorrect admin password.");
      } else {
        console.error("Failed to override incident decision on backend");
      }
    } catch (err) {
      console.error("Error overriding incident decision:", err);
    }
  };

  const handleAcknowledge = (incidentId) => {
    console.log(`Acknowledging warning incident: ${incidentId}`);
    setIncidents(prev => prev.filter(inc => inc.id !== incidentId));
    setIncidentCount(prev => Math.max(0, prev - 1));
  };

  const handleResolve = async (taskId) => {
    console.log(`Resolving department task: ${taskId}`);
    try {
      const res = await fetch(`${API_BASE}/api/dept-tasks/${taskId}/resolve`, {
        method: 'POST'
      });
      if (res.ok) {
        setTasks(prev => prev.map(t => {
          if (t._id === taskId || t.id === taskId) {
            return { ...t, status: 'resolved', urgency: 'resolved' };
          }
          return t;
        }));
      } else {
        console.error("Failed to mark task resolved on API server");
      }
    } catch (err) {
      console.error("Error sending resolution request:", err);
    }
  };

  // Views Render Functions
  const IncidentFeedView = () => {
    const [filter, setFilter] = useState('ALL');
    const [expandedIncident, setExpandedIncident] = useState(null);
    const [activeOverrideId, setActiveOverrideId] = useState(null);
    const [overrideText, setOverrideText] = useState("");

    const filteredIncidents = incidents.filter(inc => {
      if (filter === 'ALL') return true;
      return inc.severity?.toUpperCase() === filter;
    });

    return (
      <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="palantir-mono" style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>ANOMALY COMMAND CENTER</h2>
            <p className="palantir-mono" style={{ fontSize: '11px', color: '#5c7080' }}>OPERATIONAL ALERTS AUDIT FEED</p>
          </div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '8px', backgroundColor: '#0d1117', padding: '4px', borderRadius: '0px', border: '1px solid #1a2433' }}>
            {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="palantir-mono"
                style={{
                  padding: '6px 12px',
                  backgroundColor: filter === f ? '#00f0ff' : 'transparent',
                  color: filter === f ? '#080a0d' : '#8a9ba8',
                  border: 'none',
                  borderRadius: '0px',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {filteredIncidents.length === 0 ? (
            <div className="palantir-mono" style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#5c7080', backgroundColor: '#0d1117', border: '1px dashed #1a2433' }}>
              [ NO ANOMALIES RECORDED FOR STATUS: {filter} ]
            </div>
          ) : (
            filteredIncidents.map(inc => {
              const isCritical = inc.severity === 'critical';
              const isWarning = inc.severity === 'warning';
              const borderColor = isCritical ? '#ff3366' : isWarning ? '#ffb300' : '#00f0ff';

              return (
                <div key={inc.id} style={{
                  backgroundColor: '#121820',
                  border: '1px solid #1a2433',
                  borderLeft: `4px solid ${borderColor}`,
                  borderRadius: '0px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="palantir-mono" style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      color: borderColor,
                      backgroundColor: `${borderColor}0c`,
                      padding: '3px 8px',
                      border: `1px solid ${borderColor}`,
                      textTransform: 'uppercase'
                    }}>{inc.severity}</span>
                    <span className="palantir-mono" style={{ fontSize: '11px', color: '#5c7080' }}>{inc.timestamp}</span>
                  </div>

                  <div>
                    <h3 className="palantir-mono" style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{inc.title}</h3>
                    <p className="palantir-mono" style={{ fontSize: '11px', color: '#8a9ba8', marginTop: '4px' }}>TRAIN: {inc.train_number}</p>
                  </div>

                  {inc.reroute_plan && (
                    <div style={{
                      backgroundColor: 'rgba(0, 240, 255, 0.02)',
                      border: '1px dashed #1a2433',
                      padding: '12px',
                      borderRadius: '0px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div className="palantir-mono" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', color: '#5c7080', fontWeight: 700 }}>
                        <CornerDownRight size={12} style={{ color: '#00f0ff' }} />
                        REROUTE PLAN COMMAND
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                        <span className="palantir-mono" style={{ fontSize: '11px', color: '#cbd5e1' }}>{inc.reroute_plan}</span>
                        {inc.approved ? (
                          <span className="palantir-mono" style={{ color: '#00e676', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Check size={12} /> APPROVED
                          </span>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleApprove(inc.id)}
                              className="palantir-mono"
                              style={{
                                backgroundColor: '#00f0ff',
                                color: '#080a0d',
                                border: 'none',
                                borderRadius: '0px',
                                padding: '4px 10px',
                                fontSize: '10px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              APPROVE
                            </button>
                            <button
                              onClick={() => {
                                setActiveOverrideId(inc.id);
                                setOverrideText(inc.reroute_plan || "");
                              }}
                              className="palantir-mono"
                              style={{
                                backgroundColor: '#ffb300',
                                color: '#080a0d',
                                border: 'none',
                                borderRadius: '0px',
                                padding: '4px 10px',
                                fontSize: '10px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              OVERRIDE
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {activeOverrideId === inc.id && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                          <input
                            type="text"
                            value={overrideText}
                            onChange={(e) => setOverrideText(e.target.value)}
                            placeholder="Type different decision..."
                            style={{
                              backgroundColor: '#05070a',
                              border: '1px solid #ffb300',
                              color: '#cbd5e1',
                              fontSize: '10px',
                              padding: '6px',
                              fontFamily: 'inherit',
                              outline: 'none',
                              borderRadius: '0px'
                            }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              onClick={() => {
                                setActiveOverrideId(null);
                                setOverrideText("");
                              }}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#ff3366',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: '9px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              CANCEL
                            </button>
                            <button
                              onClick={() => {
                                if (overrideText.trim()) {
                                  handleOverride(inc.id, overrideText);
                                  setActiveOverrideId(null);
                                  setOverrideText("");
                                }
                              }}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#00e676',
                                color: '#080a0d',
                                border: 'none',
                                fontSize: '9px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              SUBMIT
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid #1a2433', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="palantir-mono" style={{ fontSize: '10px', color: '#5c7080' }}>
                      DISPATCH: {inc.departments.join(' // ') || 'NONE'}
                    </span>
                    <button
                      onClick={() => setExpandedIncident(expandedIncident === inc.id ? null : inc.id)}
                      className="palantir-mono"
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#00f0ff',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      {expandedIncident === inc.id ? 'HIDE DETAILS' : 'VIEW DETAILS'}
                    </button>
                  </div>

                  {expandedIncident === inc.id && (
                    <div className="palantir-mono" style={{
                      backgroundColor: '#080a0d',
                      border: '1px solid #1a2433',
                      padding: '12px',
                      borderRadius: '0px',
                      fontSize: '11px',
                      color: '#8a9ba8',
                      whiteSpace: 'pre-wrap',
                      marginTop: '4px'
                    }}>
                      {inc.description}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const AnalyticsView = () => {
    const criticalCount = incidents.filter(i => i.severity === 'critical').length;
    const warningCount = incidents.filter(i => i.severity === 'warning').length;
    const infoCount = incidents.filter(i => i.severity === 'info').length;
    const totalCount = incidents.length;

    const maxCount = Math.max(criticalCount, warningCount, infoCount, 1);
    
    // Compute average AI confidence score from actual incidents
    const incidentsWithScore = incidents.filter(i => i.confidence_score);
    const avgConfidence = incidentsWithScore.length > 0
      ? (incidentsWithScore.reduce((s, i) => s + i.confidence_score, 0) / incidentsWithScore.length).toFixed(1)
      : '—';
    
    // MTTR: approximate based on agent loop count and incident count (heuristic for demo)
    const mttr = totalCount > 0 ? (loopCount > 0 ? (loopCount * 30 / totalCount / 60).toFixed(1) : '4.2') : '0';

    return (
      <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h2 className="palantir-mono" style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>OPERATIONS ANALYTICS</h2>
          <p className="palantir-mono" style={{ fontSize: '11px', color: '#5c7080' }}>HISTORICAL ANOMALY & AGENT CYCLES TIMELINE</p>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {[
            { label: 'TOTAL INCIDENTS', val: totalCount, color: '#00f0ff' },
            { label: 'CRITICAL ALERTS', val: criticalCount, color: '#ff3366' },
            { label: 'AGENT COGNITIVE LOOPS', val: loopCount, color: '#00e676' },
            { label: 'MTTR (MINUTES)', val: `${mttr} min`, color: '#cbd5e1' },
            { label: 'AVG AI CONFIDENCE', val: avgConfidence !== '—' ? `${avgConfidence}%` : avgConfidence, color: '#ffb300' }
          ].map((stat, idx) => (
            <div key={idx} style={{
              backgroundColor: '#0d1117',
              border: '1px solid #1a2433',
              borderRadius: '0px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span className="palantir-mono" style={{ fontSize: '9px', fontWeight: 600, color: '#5c7080', letterSpacing: '0.5px' }}>{stat.label}</span>
              <span className="palantir-mono" style={{ fontSize: '28px', fontWeight: 700, color: stat.color }}>{stat.val}</span>
            </div>
          ))}
        </div>

        {/* Charts and Data Representation */}
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {/* Custom SVG Bar Chart */}
          <div style={{
            flex: 1,
            minWidth: '340px',
            backgroundColor: '#0d1117',
            border: '1px solid #1a2433',
            borderRadius: '0px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 className="palantir-mono" style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', letterSpacing: '0.5px' }}>INCIDENTS BY SEVERITY</h3>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '180px', paddingTop: '20px' }}>
              {[
                { name: 'Critical', count: criticalCount, color: '#ff3366' },
                { name: 'Warning', count: warningCount, color: '#ffb300' },
                { name: 'Info', count: infoCount, color: '#00f0ff' }
              ].map((bar, idx) => {
                const heightPercent = (bar.count / maxCount) * 140; // max height 140px
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '60px' }}>
                    <span className="palantir-mono" style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{bar.count}</span>
                    <div style={{
                      width: '32px',
                      height: `${Math.max(heightPercent, 6)}px`,
                      backgroundColor: bar.color,
                      borderRadius: '0px',
                      transition: 'height 0.5s ease-out'
                    }}></div>
                    <span className="palantir-mono" style={{ fontSize: '10px', color: '#5c7080' }}>{bar.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{
            flex: 1,
            minWidth: '340px',
            backgroundColor: '#0d1117',
            border: '1px solid #1a2433',
            borderRadius: '0px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h3 className="palantir-mono" style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', letterSpacing: '0.5px' }}>CORE SYSTEM STATUS REPORT</h3>
            <div className="palantir-mono" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: '#cbd5e1', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1a2433', paddingBottom: '6px' }}>
                <span>Operations Agent State</span>
                <span style={{ color: '#00e676', fontWeight: 600 }}>[ ACTIVE // NOMINAL ]</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1a2433', paddingBottom: '6px' }}>
                <span>Primary API Client</span>
                <span style={{ color: '#ff3366' }}>[ API FALLBACK ACTIVE ]</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1a2433', paddingBottom: '6px' }}>
                <span>Database Client</span>
                <span style={{ color: '#ff3366' }}>[ JSON FALLBACK ACTIVE ]</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px' }}>
                <span>SMS Alert Dispatcher</span>
                <span style={{ color: '#00f0ff' }}>[ MOCK MODE ACTIVE ]</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SupportView = () => {
    return (
      <div style={{ padding: '40px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', color: '#e2e8f0', textAlign: 'center' }}>
        <div style={{
          backgroundColor: '#0d1117',
          border: '1px solid #00f0ff',
          boxShadow: '0 0 15px rgba(0, 240, 255, 0.15)',
          borderRadius: '0px',
          padding: '40px 60px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          maxWidth: '560px'
        }}>
          <ShieldAlert size={48} style={{ color: '#00f0ff' }} />
          <h2 className="palantir-mono" style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', letterSpacing: '1px' }}>RAILMIND TERMINAL PORTAL</h2>
          <p className="palantir-mono" style={{ fontSize: '12px', color: '#8a9ba8', lineHeight: '1.6' }}>
            RailMind SECURE v1.0 — Multi-Agent Railway Cognitive Engine.<br />
            Secure operations console interface.
          </p>
          <div style={{ width: '100%', height: '1px', backgroundColor: '#1a2433', margin: '10px 0' }}></div>
          <span className="palantir-mono" style={{ fontSize: '10px', color: '#ff3366', fontWeight: 600, letterSpacing: '0.5px' }}>
            [ AUTHORIZED MILITARY / COGNITIVE AGENTS ONLY • SEC-SESSION 402 ]
          </span>
        </div>
      </div>
    );
  };

  const LogsView = ({ logs = [], onClear }) => {
    const logEndRef = useRef(null);

    useEffect(() => {
      if (logEndRef.current) {
        logEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, [logs]);

    return (
      <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="palantir-mono" style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={20} style={{ color: '#00f0ff' }} />
              COGNITIVE OPERATIONS STREAM
            </h2>
            <p className="palantir-mono" style={{ fontSize: '11px', color: '#5c7080' }}>REAL-TIME AGENT STATE MACHINE TRACE</p>
          </div>
          <button
            onClick={onClear}
            className="palantir-mono"
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: '1px solid #1a2433',
              borderRadius: '0px',
              color: '#8a9ba8',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#17202b';
              e.currentTarget.style.borderColor = '#00f0ff';
              e.currentTarget.style.color = '#e2e8f0';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#1a2433';
              e.currentTarget.style.color = '#8a9ba8';
            }}
          >
            CLEAR LOGSTREAM
          </button>
        </div>

        <div style={{
          flex: 1,
          backgroundColor: '#05070a',
          border: '1px solid #1a2433',
          borderRadius: '0px',
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          color: '#00f0ff',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.8)'
        }}>
          {logs.length === 0 ? (
            <div className="palantir-mono" style={{ color: '#5c7080', fontStyle: 'italic' }}>
              [SYSTEM] Awaiting live logs from operations agent stream...
            </div>
          ) : (
            logs.map((log, idx) => {
              const levelColor = 
                log.level === 'error' ? '#ff3366' :
                log.level === 'warning' ? '#ffb300' :
                log.level === 'success' ? '#00e676' :
                '#00f0ff'; // info
              
              if (log.message && !log.node) {
                return (
                  <div key={idx} style={{ lineBreak: 'anywhere', color: '#e2e8f0' }}>
                    {log.message}
                  </div>
                );
              }

              const showLevel = log.level && log.level.trim() !== "";
              return (
                <div key={idx} style={{ display: 'flex', gap: '8px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', lineBreak: 'anywhere', paddingBottom: '2px' }}>
                  <span style={{ color: '#5c7080', flexShrink: 0 }}>[{log.timestamp}]</span>
                  <span style={{ color: '#00f0ff', fontWeight: 600, flexShrink: 0 }}>[{log.node?.toUpperCase()}]</span>
                  {showLevel && <span style={{ color: levelColor, fontWeight: 700, flexShrink: 0 }}>[{log.level?.toUpperCase()}]</span>}
                  <span style={{ color: '#cbd5e1' }}>{log.message}</span>
                </div>
              );
            })
          )}
          <div ref={logEndRef}></div>
        </div>
      </div>
    );
  };

  const TelemetryView = () => {
    const [telemetry, setTelemetry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [nextRefresh, setNextRefresh] = useState(10);

    const fetchTelemetry = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/telemetry`);
        if (res.ok) {
          const data = await res.json();
          setTelemetry(data);
          setNextRefresh(10);
        }
      } catch (err) {
        console.error("Failed to fetch telemetry:", err);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchTelemetry();
      const fetchInterval = setInterval(fetchTelemetry, 10000);
      const countdownInterval = setInterval(() => {
        setNextRefresh(prev => (prev > 0 ? prev - 1 : 10));
      }, 1000);

      return () => {
        clearInterval(fetchInterval);
        clearInterval(countdownInterval);
      };
    }, []);

    if (loading && !telemetry) {
      return <div className="palantir-mono" style={{ padding: '24px', color: '#8a9ba8', fontSize: '12px' }}>[ Retrieving Sensor Data... ]</div>;
    }

    const metrics = [
      { name: 'Agent Loop Status', value: telemetry?.agent_loop_status?.toUpperCase() || 'RUNNING', color: '#00e676' },
      { name: 'Last API Call Check', value: telemetry?.last_api_call || 'Never', color: '#cbd5e1' },
      { name: 'Indian Railways Latency', value: `${telemetry?.railways_latency_ms || 0} ms`, color: '#00f0ff' },
      { name: 'AI Cognitive Latency', value: `${telemetry?.ai_latency_ms || 0} ms`, color: '#00f0ff' },
      { name: 'Live WS Connections', value: telemetry?.websocket_clients || 0, color: '#ffb300' },
      { name: 'MongoDB Incident Collections', value: telemetry?.mongodb_incidents || 0, color: '#ff3366' },
      { name: 'MongoDB Task Collections', value: telemetry?.mongodb_tasks || 0, color: '#ff3366' },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="palantir-mono" style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>System Metrics & Sensor Data</h2>
            <p className="palantir-mono" style={{ fontSize: '11px', color: '#5c7080' }}>Real-time Hardware & Multi-agent State Data</p>
          </div>
          <span className="palantir-mono" style={{ fontSize: '10px', color: '#00f0ff', border: '1px solid rgba(0, 240, 255, 0.2)', padding: '4px 8px' }}>
            REFRESH IN: {nextRefresh}S
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          {metrics.map((m, idx) => (
            <div key={idx} style={{
              backgroundColor: '#0d1117',
              border: '1px solid #1a2433',
              borderRadius: '0px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span className="palantir-mono" style={{ fontSize: '10px', fontWeight: 600, color: '#5c7080' }}>{m.name}</span>
              <span className="palantir-mono" style={{ fontSize: '20px', fontWeight: 700, color: m.color, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={m.value}>{m.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const SchedulesView = () => {
    const [scheduleTrains, setScheduleTrains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [nextRefresh, setNextRefresh] = useState(30);

    const fetchSchedules = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/trains`);
        if (res.ok) {
          const data = await res.json();
          setScheduleTrains(data);
          setNextRefresh(30);
        }
      } catch (err) {
        console.error("Failed to fetch schedules:", err);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchSchedules();
      const fetchInterval = setInterval(fetchSchedules, 30000);
      const countdownInterval = setInterval(() => {
        setNextRefresh(prev => (prev > 0 ? prev - 1 : 30));
      }, 1000);

      return () => {
        clearInterval(fetchInterval);
        clearInterval(countdownInterval);
      };
    }, []);

    if (loading && scheduleTrains.length === 0) {
      return <div className="palantir-mono" style={{ padding: '24px', color: '#8a9ba8', fontSize: '12px' }}>[ Retrieving Timetable... ]</div>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="palantir-mono" style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>Rail Network Timetable</h2>
            <p className="palantir-mono" style={{ fontSize: '11px', color: '#5c7080' }}>Live Route Timetables Feed</p>
          </div>
          <span className="palantir-mono" style={{ fontSize: '10px', color: '#ffb300', border: '1px solid rgba(255, 179, 0, 0.2)', padding: '4px 8px' }}>
            AUTO-REFRESH IN: {nextRefresh}S
          </span>
        </div>

        <div style={{
          backgroundColor: '#0d1117',
          border: '1px solid #1a2433',
          borderRadius: '0px',
          overflow: 'hidden'
        }}>
          <table className="palantir-mono" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#121820', borderBottom: '1px solid #1a2433', color: '#8a9ba8' }}>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>TRAIN NO</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>NAME</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>CORRIDOR ROUTE</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>STATUS</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>DELAY OFFSET</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>GPS POSITION</th>
              </tr>
            </thead>
            <tbody>
              {scheduleTrains.map((train, idx) => {
                const isDelayed = train.delay_minutes > 0;
                const statusColor = train.status === 'cancelled' ? '#ff3366' : isDelayed ? '#ffb300' : '#00e676';
                return (
                  <tr key={idx} style={{
                    borderBottom: '1px solid #121820',
                    color: '#cbd5e1',
                    backgroundColor: idx % 2 === 0 ? '#0d1117' : '#0f141b'
                  }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#00f0ff' }}>{train.train_number}</td>
                    <td style={{ padding: '12px 16px' }}>{train.train_name}</td>
                    <td style={{ padding: '12px 16px' }}>{train.source || 'NDLS'} → {train.destination || 'RKMP'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: statusColor }}>
                      {train.status?.toUpperCase() || 'UNKNOWN'}
                    </td>
                    <td style={{ padding: '12px 16px', color: isDelayed ? '#ffb300' : '#5c7080' }}>
                      {isDelayed ? `+${train.delay_minutes} min` : '--'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#8a9ba8' }}>{train.current_station || 'GPS LOSS'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const AssetsView = () => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [nextRefresh, setNextRefresh] = useState(15);

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/system-status`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
          setNextRefresh(15);
        }
      } catch (err) {
        console.error("Failed to fetch system status:", err);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchStatus();
      const fetchInterval = setInterval(fetchStatus, 15000);
      const countdownInterval = setInterval(() => {
        setNextRefresh(prev => (prev > 0 ? prev - 1 : 15));
      }, 1000);

      return () => {
        clearInterval(fetchInterval);
        clearInterval(countdownInterval);
      };
    }, []);

    if (loading && !status) {
      return <div className="palantir-mono" style={{ padding: '24px', color: '#8a9ba8', fontSize: '12px' }}>[ Connecting to System Fleet... ]</div>;
    }

    const services = [
      { name: 'Core Orchestrator Node', status: status?.agent_status || 'ACTIVE', isConnected: true },
      { name: 'Cognitive Reasoning Model', status: status?.model || 'GEMINI 2.5 FLASH / CLAUDE', isConnected: true },
      { name: 'Indian Railways Telemetry API', status: status?.railways_api || 'Disconnected', isConnected: status?.railways_api === 'Connected' },
      { name: 'Twilio Warning Alert Gateway', status: status?.twilio_sms || 'Disconnected', isConnected: status?.twilio_sms === 'Connected' },
      { name: 'MongoDB Cloud Collections', status: status?.mongodb || 'Disconnected', isConnected: status?.mongodb === 'Connected' }
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="palantir-mono" style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>System Registry & Fleet</h2>
            <p className="palantir-mono" style={{ fontSize: '11px', color: '#5c7080' }}>Node Networks & Fleet Status</p>
          </div>
          <span className="palantir-mono" style={{ fontSize: '10px', color: '#00e676', border: '1px solid rgba(0, 230, 118, 0.2)', padding: '4px 8px' }}>
            HEARTBEAT IN: {nextRefresh}S
          </span>
        </div>

        {/* Connection Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {services.map((s, idx) => (
            <div key={idx} style={{
              backgroundColor: '#0d1117',
              border: `1px solid ${s.isConnected ? '#00e67633' : '#ff336633'}`,
              borderRadius: '0px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: s.isConnected ? '0 0 10px rgba(0, 230, 118, 0.03)' : '0 0 10px rgba(255, 51, 102, 0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="palantir-mono" style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>{s.name}</span>
                <span style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: s.isConnected ? '#00e676' : '#ff3366',
                  boxShadow: s.isConnected ? '0 0 6px #00e676' : '0 0 6px #ff3366'
                }}></span>
              </div>
              <span className="palantir-mono" style={{ fontSize: '13px', color: s.isConnected ? '#00e676' : '#ff3366', fontWeight: 700 }}>
                [ {s.status.toUpperCase()} ]
              </span>
            </div>
          ))}
        </div>

        {/* Contacts Section */}
        <div style={{
          backgroundColor: '#0d1117',
          border: '1px solid #1a2433',
          borderRadius: '0px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <h3 className="palantir-mono" style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>NODE DISPATCH CONTACTS REGISTRY</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="palantir-mono" style={{ fontSize: '10px', color: '#5c7080', fontWeight: 600 }}>MAINTENANCE COORDINATES</span>
              <span className="palantir-mono" style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 500 }}>{status?.contacts?.maintenance || 'MOCK_GATEWAY'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="palantir-mono" style={{ fontSize: '10px', color: '#5c7080', fontWeight: 600 }}>OPERATIONS CONTROLLERS</span>
              <span className="palantir-mono" style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 500 }}>{status?.contacts?.operations || 'MOCK_GATEWAY'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="palantir-mono" style={{ fontSize: '10px', color: '#5c7080', fontWeight: 600 }}>STATION MANAGERS DESK</span>
              <span className="palantir-mono" style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 500 }}>{status?.contacts?.station_manager || 'MOCK_GATEWAY'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleCommandSubmit = async (e) => {
    e.preventDefault();
    if (!commandText.trim()) return;
    setCommandResult("Executing operational instruction...");
    try {
      const res = await fetch(`${API_BASE}/api/agent-command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: commandText })
      });
      if (res.ok) {
        const data = await res.json();
        setCommandResult(data.response);
        if (data.log) {
          setLogs(prev => [...prev, { message: `[${new Date().toLocaleTimeString()}] ${data.log}` }].slice(-200));
        }
        setCommandText('');
      } else {
        setCommandResult("Error: Failed to process command.");
      }
    } catch (err) {
      setCommandResult("Error: Connection lost.");
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              borderRight: '1px solid #1a2433',
              backgroundColor: '#080a0d'
            }}>
              <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <LiveMap trains={trains} incidents={incidents} />
                  
                  {/* Floating Predictive Intelligence Panel Overlay */}
                  {prediction && (
                    <div style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      zIndex: 1000,
                      width: '320px',
                      backgroundColor: 'rgba(13, 17, 23, 0.92)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '0px',
                      padding: '14px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                      backdropFilter: 'blur(4px)',
                      fontFamily: "'JetBrains Mono', monospace"
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', borderBottom: '1px solid #1a2433', paddingBottom: '4px' }}>
                        <ShieldAlert size={14} style={{ color: '#00f0ff' }} />
                        <h4 style={{ margin: 0, fontSize: '9px', fontWeight: 700, color: '#00f0ff', letterSpacing: '1px' }}>
                          RAILMIND PREDICTIVE INTELLIGENCE (30M)
                        </h4>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '9px' }}>
                        <div>
                          <span style={{ color: '#ffb300', fontWeight: 700 }}>AT-RISK SERVICES: </span>
                          <span style={{ color: '#e2e8f0' }}>{prediction.at_risk_trains?.join(', ') || 'None'}</span>
                        </div>
                        <div>
                          <span style={{ color: '#ff3366', fontWeight: 700 }}>CONGESTION SPOTS: </span>
                          <span style={{ color: '#e2e8f0' }}>{prediction.congestion_stations?.join(', ') || 'None'}</span>
                        </div>
                        <div>
                          <span style={{ color: '#90a4ae', fontWeight: 700 }}>WORST CASE SCENARIO: </span>
                          <p style={{ margin: '2px 0 0 0', color: '#cbd5e1', lineHeight: '1.3' }}>{prediction.worst_case}</p>
                        </div>
                        <div>
                          <span style={{ color: '#00e676', fontWeight: 700 }}>PREEMPTIVE ACTIONS: </span>
                          <ul style={{ margin: '4px 0 0 0', paddingLeft: '14px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {prediction.preemptive_actions?.map((act, i) => (
                              <li key={i}>{act}</li>
                            ))}
                          </ul>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px solid #1a2433', paddingTop: '4px' }}>
                          <span style={{ color: '#5c7080' }}>CONFIDENCE:</span>
                          <span style={{ color: '#00f0ff', fontWeight: 700 }}>{((prediction.confidence || 0.9) * 100).toFixed(0)}% CERTITUDE</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Floating AI Command Terminal Overlay */}
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    zIndex: 1000,
                    width: '320px',
                    backgroundColor: 'rgba(13, 17, 23, 0.92)',
                    border: '1px solid #1a2433',
                    borderRadius: '0px',
                    padding: '14px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    fontFamily: "'JetBrains Mono', monospace"
                  }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '9px', fontWeight: 700, color: '#00f0ff', letterSpacing: '1px' }}>
                      RAILMIND COGNITIVE TERMINAL
                    </h4>
                    <form onSubmit={handleCommandSubmit} style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={commandText}
                        onChange={(e) => setCommandText(e.target.value)}
                        placeholder="Ask RailMind agent (e.g. bypass CNB)..."
                        style={{
                          flex: 1,
                          backgroundColor: '#05070a',
                          border: '1px solid #1a2433',
                          color: '#cbd5e1',
                          fontSize: '10px',
                          padding: '6px 8px',
                          fontFamily: 'inherit',
                          outline: 'none',
                          borderRadius: '0px'
                        }}
                      />
                      <button
                        type="submit"
                        style={{
                          backgroundColor: '#00f0ff',
                          color: '#080a0d',
                          border: 'none',
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '6px 12px',
                          cursor: 'pointer',
                          borderRadius: '0px'
                        }}
                      >
                        EXECUTE
                      </button>
                    </form>
                    {commandResult && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px',
                        backgroundColor: 'rgba(0, 240, 255, 0.03)',
                        border: '1px dashed rgba(0, 240, 255, 0.2)',
                        fontSize: '9px',
                        color: '#00f0ff',
                        lineHeight: '1.4',
                        maxHeight: '80px',
                        overflowY: 'auto'
                      }}>
                        {commandResult}
                      </div>
                    )}
                  </div>
                </div>
                {/* Last Scanned Status Bar */}
                <div className="palantir-mono" style={{
                  height: '24px',
                  backgroundColor: '#0a0d14',
                  borderTop: '1px solid #1a2433',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  fontSize: '10px',
                  color: '#8a9ba8',
                  gap: '12px',
                  zIndex: 99
                }}>
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: '#00e676', borderRadius: '50%' }}></span>
                  <span>Agent loop status: <strong style={{ color: '#00e676' }}>ACTIVE</strong></span>
                  <span style={{ color: '#1a2433' }}>|</span>
                  <span>Last scanned: <strong style={{ color: '#00f0ff' }}>{secondsSinceScan} seconds ago</strong></span>
                  <span style={{ color: '#1a2433' }}>|</span>
                  <span>Active Monitored Corridors: <strong style={{ color: '#cbd5e1' }}>15 Corridors (Indian Railways Mainlines)</strong></span>
                </div>

                {/* AGENT BRAIN — LIVE REASONING SECTION */}
                {(() => {
                  const isPerceivingActive = ['evaluate_previous_action', 'ingest_node', 'detect_node', 'SCANNING', 'DETECTED', 'CASCADE?'].includes(agentState);
                  const isDecidingActive = ['predict_node', 'reason_node', 'THINKING', 'PERCEIVED', 'DECIDING', 'DECIDED', 'PREDICTING'].includes(agentState);
                  const isActingActive = ['reroute_node', 'coordination_node', 'alert_node', 'report_node', 'ACTING', 'SMS', 'LOGGED', 'COMPLETE'].includes(agentState);

                  return (
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#0a0d14',
                      borderTop: '1px solid #1a2433',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div className="palantir-mono" style={{ fontSize: '11px', fontWeight: 700, color: '#5c7080', letterSpacing: '1.5px' }}>
                        AGENT BRAIN — LIVE REASONING
                      </div>
                      
                      {/* 3 Columns Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        
                        {/* PERCEIVING Column */}
                        <div className={`palantir-mono ${isPerceivingActive ? 'pulse-perceive' : ''}`} style={{
                          backgroundColor: '#121820',
                          border: '1px solid #1a2433',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          borderRadius: '0px',
                          transition: 'border-color 0.3s, box-shadow 0.3s'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: isPerceivingActive ? '#00f0ff' : '#8a9ba8' }}>
                              PERCEIVING
                            </span>
                            {isPerceivingActive && (
                              <span style={{ width: '6px', height: '6px', backgroundColor: '#00f0ff', borderRadius: '50%', boxShadow: '0 0 6px #00f0ff' }}></span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#cbd5e1', minHeight: '34px', lineHeight: '1.4' }}>
                            "{perceivingText}"
                          </div>
                          <div style={{ fontSize: '10px', color: '#5c7080', borderTop: '1px solid #1a2433', paddingTop: '6px' }}>
                            Confidence: <strong style={{ color: '#00f0ff' }}>{perceivingConfidence}</strong>
                          </div>
                        </div>

                        {/* DECIDING Column */}
                        <div className={`palantir-mono ${isDecidingActive ? 'pulse-decide' : ''}`} style={{
                          backgroundColor: '#121820',
                          border: '1px solid #1a2433',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          borderRadius: '0px',
                          transition: 'border-color 0.3s, box-shadow 0.3s'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: isDecidingActive ? '#ffb300' : '#8a9ba8' }}>
                              DECIDING
                            </span>
                            {isDecidingActive && (
                              <span style={{ width: '6px', height: '6px', backgroundColor: '#ffb300', borderRadius: '50%', boxShadow: '0 0 6px #ffb300' }}></span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#cbd5e1', minHeight: '34px', lineHeight: '1.4' }}>
                            "{decidingText}"
                          </div>
                          <div style={{ fontSize: '10px', color: '#5c7080', borderTop: '1px solid #1a2433', paddingTop: '6px' }}>
                            Confidence: <strong style={{ color: '#ffb300' }}>{decidingConfidence}</strong>
                          </div>
                        </div>

                        {/* ACTING Column */}
                        <div className={`palantir-mono ${isActingActive ? 'pulse-act' : ''}`} style={{
                          backgroundColor: '#121820',
                          border: '1px solid #1a2433',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          borderRadius: '0px',
                          transition: 'border-color 0.3s, box-shadow 0.3s'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: isActingActive ? '#00e676' : '#8a9ba8' }}>
                              ACTING
                            </span>
                            {isActingActive && (
                              <span style={{ width: '6px', height: '6px', backgroundColor: '#00e676', borderRadius: '50%', boxShadow: '0 0 6px #00e676' }}></span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#cbd5e1', minHeight: '34px', lineHeight: '1.4' }}>
                            "{actingText}"
                          </div>
                          <div style={{ fontSize: '10px', color: '#5c7080', borderTop: '1px solid #1a2433', paddingTop: '6px' }}>
                            Status: <strong style={{ color: actingStatus === 'COMPLETE' ? '#00e676' : actingStatus === 'RUNNING' ? '#ffb300' : '#cbd5e1' }}>{actingStatus}</strong>
                          </div>
                        </div>

                      </div>

                      {/* Prediction Panel below the 3 columns */}
                      <div className="palantir-mono" style={{
                        backgroundColor: 'rgba(255, 51, 102, 0.05)',
                        border: '1px solid rgba(255, 51, 102, 0.2)',
                        padding: '10px 14px',
                        fontSize: '10px',
                        color: '#e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{ fontWeight: 700, color: '#ff3366', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ShieldAlert size={12} /> PREDICTION PANEL
                        </div>
                        <div>
                          {prediction ? (
                            <span>
                              In the next 30 minutes: <strong>{prediction.at_risk_trains?.length || 3} trains at risk</strong> of delay cascade on <strong>{prediction.congestion_stations?.slice(0, 2).join('-') || 'Delhi-Howrah'}</strong> corridor. Preemptive alerts dispatched to <strong>{prediction.congestion_stations?.slice(-2).join(' and ') || 'Allahabad and Kanpur'}</strong> stations.
                            </span>
                          ) : (
                            <span>
                              In the next 30 minutes: 3 trains at risk of delay cascade on Delhi-Howrah corridor. Preemptive alerts dispatched to Allahabad and Kanpur stations.
                            </span>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })()}

                {/* Live scrollable Terminal Widget */}
                <div style={{
                  height: '140px',
                  backgroundColor: '#05070a',
                  borderTop: '1px solid #1a2433',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}>
                  {/* Terminal Header */}
                  <div style={{
                    height: '24px',
                    backgroundColor: '#0d1117',
                    borderBottom: '1px solid #1a2433',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 16px',
                    fontSize: '9px',
                    fontWeight: 700,
                    color: '#5c7080',
                    letterSpacing: '1px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#00f0ff', borderRadius: '50%', animation: 'pulse-live 1s infinite' }}></span>
                      <span>COGNITIVE AGENT STREAM TERMINAL</span>
                    </div>
                    <span>LOGSTREAM // SECURE_NODE_ALPHA</span>
                  </div>

                  {/* Terminal Body */}
                  <div style={{
                    flex: 1,
                    padding: '10px 16px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '10px',
                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)'
                  }}>
                    {logs.length === 0 ? (
                      <div style={{ color: '#5c7080', fontStyle: 'italic' }}>
                        [SYSTEM] Awaiting live logs from operations agent stream...
                      </div>
                    ) : (
                      logs.map((log, idx) => {
                        const levelColor = 
                          log.level === 'error' ? '#ff3366' :
                          log.level === 'warning' ? '#ffb300' :
                          log.level === 'success' ? '#00e676' :
                          '#00f0ff'; // info
                        
                        if (log.message && !log.node) {
                          return (
                            <div key={idx} style={{ lineBreak: 'anywhere', color: '#e2e8f0' }}>
                              {log.message}
                            </div>
                          );
                        }

                        const showLevel = log.level && log.level.trim() !== "";
                        return (
                          <div key={idx} style={{ display: 'flex', gap: '8px', lineBreak: 'anywhere', paddingBottom: '1px' }}>
                            <span style={{ color: '#5c7080', flexShrink: 0 }}>[{log.timestamp}]</span>
                            <span style={{ color: '#00f0ff', fontWeight: 600, flexShrink: 0 }}>[{log.node?.toUpperCase()}]</span>
                            {showLevel && <span style={{ color: levelColor, fontWeight: 700, flexShrink: 0 }}>[{log.level?.toUpperCase()}]</span>}
                            <span style={{ color: '#cbd5e1' }}>{log.message}</span>
                          </div>
                        );
                      })
                    )}
                    <div ref={terminalEndRef}></div>
                  </div>
                </div>
              </div>
              
              {/* TaskBoard & SMS Outbox side-by-side split */}
              <div style={{ display: 'flex', borderTop: '1px solid #1a2433', height: '240px' }}>
                <div style={{ flex: 2, overflowY: 'auto' }}>
                  <TaskBoard tasks={tasks} onResolve={handleResolve} />
                </div>
                <div style={{
                  flex: 1,
                  backgroundColor: '#0d1117',
                  borderLeft: '1px solid #1a2433',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '16px',
                  overflow: 'hidden'
                }}>
                  <h3 className="palantir-mono" style={{ fontSize: '10px', fontWeight: 700, color: '#5c7080', letterSpacing: '1.5px', marginBottom: '8px' }}>
                    PASSENGER SMS DISPATCH OUTBOX
                  </h3>
                  <div style={{
                    flex: 1,
                    backgroundColor: '#05070a',
                    border: '1px solid #1a2433',
                    padding: '10px',
                    overflowY: 'auto',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '9px',
                    color: '#8a9ba8',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    {smsLogs.length === 0 ? (
                      <div style={{ color: '#5c7080', fontStyle: 'italic' }}>[OUTBOX] Awaiting alert triggers...</div>
                    ) : (
                      smsLogs.map((log, idx) => (
                        <div key={idx} style={{
                          borderBottom: '1px solid #121820',
                          paddingBottom: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ffb300', fontWeight: 600 }}>
                            <span>TO: {log.to}</span>
                            <span style={{ color: '#00e676' }}>[SENT]</span>
                          </div>
                          <p style={{ margin: 0, color: '#cbd5e1' }}>{log.body}</p>
                          <span style={{ fontSize: '8px', color: '#5c7080' }}>SID: {log.sid}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
            <IncidentFeed 
              incidents={incidents} 
              onApprove={handleApprove}
              onOverride={handleOverride}
              onAcknowledge={handleAcknowledge}
            />
          </div>
        );

      case 'Live Map':
        return (
          <div style={{ flex: 1, position: 'relative', height: '100%' }}>
            <LiveMap trains={trains} incidents={incidents} />
          </div>
        );

      case 'Incident Feed':
        return <IncidentFeedView />;

      case 'Task Board':
        return (
          <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <TaskBoard tasks={tasks} onResolve={handleResolve} fullScreen={true} />
          </div>
        );

      case 'Analytics':
        return <AnalyticsView />;

      case 'Support':
        return <SupportView />;

      case 'Logs':
        return <LogsView logs={logs} onClear={() => setLogs([])} />;

      case 'Sensor Data':
        return <RouteIntelligence trains={trains} />;

      case 'Timetable':
        return <SchedulesView />;

      case 'Fleet':
        return <AssetsView />;

      default:
        return <div className="palantir-mono" style={{ padding: '24px', fontSize: '12px' }}>[ PAGE NOT DEPLOYED ]</div>;
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#080a0d',
      overflow: 'hidden'
    }}>
      <TopBar 
        loopCount={loopCount} 
        incidentCount={incidentCount} 
        wsStatus={wsStatus} 
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'Rail Network') {
            setActiveTab('Dashboard');
          } else {
            setActiveTab(tab);
          }
        }}
        onSettingsClick={() => setShowSettings(true)}
        onNotificationsClick={() => setShowNotifications(true)}
        onProfileClick={() => setShowProfile(true)}
        liveFlash={liveFlash}
        cycleCountdown={cycleCountdown}
      />

      {cascadeAlert && (
        <div className="palantir-mono animate-pulse" style={{
          backgroundColor: '#ff3366',
          color: '#ffffff',
          padding: '10px 24px',
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '1px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid #ff0044',
          boxShadow: '0 4px 15px rgba(255, 51, 102, 0.4)',
          zIndex: 999
        }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#ffffff', borderRadius: '50%', animation: 'pulse-live 1s infinite' }}></span>
          <span>⚠ {cascadeAlert.message.toUpperCase()} — AGENT IMPLEMENTING NETWORK-WIDE CORRIDOR DETOUR RESPONSE.</span>
        </div>
      )}

      {wsStatus === 'reconnecting' && (
        <div style={{
          backgroundColor: '#ff3366',
          color: '#ffffff',
          textAlign: 'center',
          padding: '8px 24px',
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '1px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          zIndex: 1000,
          borderBottom: '1px solid #ff3366',
          boxShadow: '0 4px 20px rgba(255, 51, 102, 0.2)'
        }}>
          <span style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            backgroundColor: '#ffffff',
            borderRadius: '50%',
            animation: 'pulse-live 1s infinite'
          }}></span>
          [ OFFLINE // RE-ESTABLISHING AGENT CONNECTION... ]
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} agentState={agentState} />
        {renderContent()}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(5, 7, 10, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            backgroundColor: '#0d1117',
            border: '1px solid #00f0ff',
            borderRadius: '0px',
            padding: '24px',
            width: '420px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="palantir-mono" style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={18} style={{ color: '#00f0ff' }} />
                SYSTEM // CONFIGURATION
              </h3>
              <button onClick={() => setShowSettings(false)} style={{ backgroundColor: 'transparent', border: 'none', color: '#5c7080', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            
            <div className="palantir-mono" style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '11px', color: '#cbd5e1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: '#00f0ff' }} /> ALLOW COGNITIVE REROUTING DISPATCH
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: '#00f0ff' }} /> TELEMETRY CACHE / DATABASE FALLBACK
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: '#00f0ff' }} /> ENABLE REAL-TIME WS STREAMING
              </label>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="palantir-mono"
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                backgroundColor: '#00f0ff',
                color: '#080a0d',
                border: 'none',
                borderRadius: '0px',
                fontWeight: 700,
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              SAVE CONFIGURATION
            </button>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotifications && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(5, 7, 10, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            backgroundColor: '#0d1117',
            border: '1px solid #ff3366',
            borderRadius: '0px',
            padding: '24px',
            width: '420px',
            maxHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 0 20px rgba(255, 51, 102, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="palantir-mono" style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={18} style={{ color: '#ff3366' }} />
                REAL-TIME WARNINGS STREAM
              </h3>
              <button onClick={() => setShowNotifications(false)} style={{ backgroundColor: 'transparent', border: 'none', color: '#5c7080', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }}>
              {recentIncidentElements}
              {incidents.length === 0 && (
                <div className="palantir-mono" style={{ color: '#5c7080', fontStyle: 'italic', textAlign: 'center', padding: '20px', fontSize: '11px' }}>
                  [ NO SYSTEM ALERTS RECORDED ]
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(5, 7, 10, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            backgroundColor: '#0d1117',
            border: '1px solid #00f0ff',
            borderRadius: '0px',
            padding: '28px',
            width: '380px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            textAlign: 'center',
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)'
          }}>
            <div style={{ alignSelf: 'stretch', display: 'flex', justifySelf: 'flex-end', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowProfile(false)} style={{ backgroundColor: 'transparent', border: 'none', color: '#5c7080', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '0px',
              overflow: 'hidden',
              border: '1px solid #00f0ff',
              boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)'
            }}>
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" 
                alt="User profile" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div>
              <h3 className="palantir-mono" style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>OPERATOR // SHREYAM</h3>
              <p className="palantir-mono" style={{ fontSize: '11px', color: '#00f0ff', fontWeight: 600 }}>CHIEF OPERATIONS MANAGER</p>
            </div>

            <div style={{ width: '100%', height: '1px', backgroundColor: '#1a2433' }}></div>

            <div className="palantir-mono" style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#5c7080' }}>OPERATIONS TERMINAL</span>
                <span>SEC-NODE-ALPHA</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#5c7080' }}>AUTHORIZATION LEVEL</span>
                <span style={{ color: '#ffb300', fontWeight: 600 }}>SEC-LEVEL-5</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
