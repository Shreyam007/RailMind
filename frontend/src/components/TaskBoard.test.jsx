import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TaskBoard from './TaskBoard';

describe('TaskBoard', () => {
  it('renders default mock tasks when tasks prop is empty', () => {
    render(<TaskBoard />);

    expect(screen.getByText('Engine check - Train 402')).toBeInTheDocument();
    expect(screen.getByText('Signal Calibration')).toBeInTheDocument();
    expect(screen.getByText('Platform 4 Clearance')).toBeInTheDocument();
  });

  it('renders custom tasks when provided', () => {
    const customTasks = [
      {
        id: "custom_1",
        department: "maintenance",
        task_description: "Custom Maintenance Task",
        urgency: "high",
        action_required: "Fix ASAP"
      },
      {
        id: "custom_2",
        department: "operations",
        task_description: "Custom Ops Task",
        urgency: "low",
        action_required: "Review logs"
      }
    ];

    render(<TaskBoard tasks={customTasks} />);

    expect(screen.getByText('Custom Maintenance Task')).toBeInTheDocument();
    expect(screen.getByText('Custom Ops Task')).toBeInTheDocument();

    // Ensure default tasks are not rendered
    expect(screen.queryByText('Engine check - Train 402')).not.toBeInTheDocument();
  });

  it('calls onResolve with the task ID when resolve button is clicked', () => {
    const mockOnResolve = vi.fn();
    const customTasks = [
      {
        id: "custom_1",
        department: "maintenance",
        task_description: "Custom Maintenance Task",
        urgency: "high",
        action_required: "Fix ASAP"
      }
    ];

    render(<TaskBoard tasks={customTasks} onResolve={mockOnResolve} />);

    const resolveButtons = screen.getAllByRole('button', { name: /mark task as resolved/i });
    expect(resolveButtons).toHaveLength(1);

    fireEvent.click(resolveButtons[0]);
    expect(mockOnResolve).toHaveBeenCalledWith('custom_1');
  });

  it('does not show resolve button for resolved tasks', () => {
      const customTasks = [
        {
          id: "custom_1",
          department: "maintenance",
          task_description: "Custom Maintenance Task",
          urgency: "resolved",
          action_required: "Fixed"
        }
      ];

      render(<TaskBoard tasks={customTasks} />);
      const resolveButtons = screen.queryAllByRole('button', { name: /mark task as resolved/i });
      expect(resolveButtons).toHaveLength(0);
  });
});
