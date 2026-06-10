import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from './Sidebar';

describe('Sidebar Component', () => {
  it('renders all menu items', () => {
    render(<Sidebar setActiveTab={() => {}} />);

    // Check main menu items
    expect(screen.getByRole('button', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Live Map/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Incident Feed/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Task Board/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Analytics/i })).toBeInTheDocument();

    // Check footer items
    expect(screen.getByRole('button', { name: /SUPPORT/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /LOGS/i })).toBeInTheDocument();
  });

  it('highlights the active tab', () => {
    render(<Sidebar activeTab="Live Map" setActiveTab={() => {}} />);

    const activeTabButton = screen.getByRole('button', { name: /Live Map/i });
    const inactiveTabButton = screen.getByRole('button', { name: /Dashboard/i });

    // Active tab has specific styles
    expect(activeTabButton).toHaveStyle('background-color: rgb(28, 32, 42)'); // #1c202a
    expect(activeTabButton).toHaveStyle('color: rgb(248, 250, 252)'); // #f8fafc

    // Inactive tab has different styles
    expect(inactiveTabButton).toHaveStyle('background-color: rgba(0, 0, 0, 0)'); // transparent translates to rgba(0, 0, 0, 0) in jsdom
    expect(inactiveTabButton).toHaveStyle('color: rgb(203, 213, 225)'); // #cbd5e1
  });

  it('calls setActiveTab when a menu item is clicked', async () => {
    const setActiveTabMock = vi.fn();
    render(<Sidebar setActiveTab={setActiveTabMock} />);

    const mapButton = screen.getByRole('button', { name: /Live Map/i });
    await userEvent.click(mapButton);

    expect(setActiveTabMock).toHaveBeenCalledTimes(1);
    expect(setActiveTabMock).toHaveBeenCalledWith('Live Map');
  });

  it('calls setActiveTab when a footer item is clicked', async () => {
    const setActiveTabMock = vi.fn();
    render(<Sidebar setActiveTab={setActiveTabMock} />);

    const logsButton = screen.getByRole('button', { name: /LOGS/i });
    await userEvent.click(logsButton);

    expect(setActiveTabMock).toHaveBeenCalledTimes(1);
    expect(setActiveTabMock).toHaveBeenCalledWith('Logs');
  });
});
