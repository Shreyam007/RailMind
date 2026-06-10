/* eslint-disable */
import React from 'react';
import { MoreHorizontal, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function TaskBoard({ tasks = [], onResolve, fullScreen = false }) {
  // Setup default mock tasks if tasks list is empty
  const activeTasks = tasks.length > 0 ? tasks : [
    {
      id: "task_001",
      department: "maintenance",
      task_description: "Engine check - Train 402",
      urgency: "urgent",
      action_required: "DUE: 15:00"
    },
    {
      id: "task_002",
      department: "operations",
      task_description: "Signal Calibration",
      urgency: "medium",
      action_required: "ASSIGNED: ALPHA-9"
    },
    {
      id: "task_003",
      department: "station_manager",
      task_description: "Platform 4 Clearance",
      urgency: "resolved",
      action_required: "COMPLETED 10:55"
    }
  ];

  // Group tasks by department
  const { maintenanceTasks, operationsTasks, stationTasks } = activeTasks.reduce(
    (acc, t) => {
      const dept = t.department?.toLowerCase();
      if (dept === 'maintenance') {
        acc.maintenanceTasks.push(t);
      } else if (dept === 'operations') {
        acc.operationsTasks.push(t);
      } else if (dept === 'station_manager' || dept === 'station') {
        acc.stationTasks.push(t);
      }
      return acc;
    },
    { maintenanceTasks: [], operationsTasks: [], stationTasks: [] }
  );

  const getUrgencyBadge = (urgency) => {
    let color = '#ef4444'; // Red
    let bg = 'rgba(239, 68, 68, 0.1)';
    let text = 'URGENT';

    if (urgency.toLowerCase() === 'medium') {
      color = '#f59e0b'; // Yellow
      bg = 'rgba(245, 158, 11, 0.1)';
      text = 'MEDIUM';
    } else if (urgency.toLowerCase() === 'resolved') {
      color = '#10b981'; // Green
      bg = 'rgba(16, 185, 129, 0.1)';
      text = 'RESOLVED';
    } else if (urgency.toLowerCase() === 'low') {
      color = '#3b82f6'; // Blue
      bg = 'rgba(59, 130, 246, 0.1)';
      text = 'LOW';
    } else if (urgency.toLowerCase() === 'high') {
      color = '#f97316'; // Orange
      bg = 'rgba(249, 115, 22, 0.1)';
      text = 'HIGH';
    } else if (urgency.toLowerCase() === 'critical') {
      color = '#b91c1c'; // Dark Red
      bg = 'rgba(185, 28, 28, 0.1)';
      text = 'CRITICAL';
    }

    return (
      <span style={{
        fontSize: '9px',
        fontWeight: 700,
        color: color,
        backgroundColor: bg,
        padding: '2px 6px',
        borderRadius: '3px',
        letterSpacing: '0.5px'
      }}>
        {text}
      </span>
    );
  };

  const renderColumn = (title, columnTasks) => {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        borderRight: '1px solid #1a1e26'
      }}>
        <h3 style={{
          fontSize: '10px',
          fontWeight: 600,
          color: '#64748b',
          letterSpacing: '1px',
          textTransform: 'uppercase'
        }}>
          {title}
        </h3>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          overflowY: 'auto'
        }}>
          {columnTasks.map((task) => {
            const isResolved = task.status?.toLowerCase() === 'resolved' || task.urgency?.toLowerCase() === 'resolved';

            return (
              <div
                key={task.id || task._id}
                style={{
                  backgroundColor: '#161920',
                  border: '1px solid #1a1e26',
                  borderRadius: '6px',
                  padding: '16px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1c202a'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#161920'}
              >
                {/* Badge & dots */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {getUrgencyBadge(task.urgency)}
                  {isResolved ? (
                    <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                  ) : (
                    <button 
                      onClick={() => onResolve && onResolve(task._id || task.id)}
                      title="Mark task as resolved"
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#10b981'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  )}
                </div>

                {/* Description */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {!isResolved && task.urgency?.toLowerCase() === 'urgent' && (
                    <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                  )}
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: isResolved ? '#64748b' : '#fff',
                    textDecoration: isResolved ? 'line-through' : 'none'
                  }}>
                    {task.task_description}
                  </span>
                </div>

                {/* Details */}
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                  {task.action_required}
                </span>

                {/* completion check visual */}
                {isResolved && (
                  <div style={{
                    position: 'absolute',
                    right: '16px',
                    bottom: '16px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}>
                    <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      height: fullScreen ? '100%' : '240px',
      flex: fullScreen ? 1 : 'none',
      backgroundColor: '#11141a',
      borderTop: '1px solid #1a1e26',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: fullScreen ? 1 : 0
    }}>
      {/* Legend & Header */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid #1a1e26',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', letterSpacing: '0.5px' }}>
          DEPARTMENTAL TASK BOARD
        </h2>
        
        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', backgroundColor: '#ef4444', borderRadius: '50%' }}></span>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>Urgent</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', backgroundColor: '#f59e0b', borderRadius: '50%' }}></span>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>Medium</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '50%' }}></span>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>Resolved</span>
          </div>
        </div>
      </div>

      {/* Grid columns */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {renderColumn('Maintenance', maintenanceTasks)}
        {renderColumn('Operations', operationsTasks)}
        {renderColumn('Station Manager', stationTasks)}
      </div>
    </div>
  );
}
