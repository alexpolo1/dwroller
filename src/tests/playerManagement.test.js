import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import PlayerManagement from '../components/PlayerManagement';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock window.confirm
const mockConfirm = jest.fn();
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true,
});

describe('PlayerManagement Component', () => {
  const mockSessionId = 'test-session-123';
  const mockAuthedPlayer = 'gm';

  // Mock player data
  const mockPlayers = [
    {
      name: 'TestPlayer',
      tabInfo: {
        rp: 50,
        xp: 1000,
        xpSpent: 200,
        renown: 'Respected',
        charName: 'Brother Testicus'
      }
    }
  ];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockConfirm.mockReturnValue(true);
    
    // Mock successful API responses
    mockedAxios.get.mockResolvedValue({ data: mockPlayers });
    mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });
    mockedAxios.delete.mockResolvedValue({ status: 200, data: { success: true } });
  });

  test('renders access denied for non-GM users', () => {
    render(<PlayerManagement authedPlayer="player1" sessionId={mockSessionId} />);
    
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText(/Player Management is only accessible to Game Masters/)).toBeInTheDocument();
  });

  test('renders player management interface for GM', async () => {
    render(<PlayerManagement authedPlayer={mockAuthedPlayer} sessionId={mockSessionId} />);
    
    expect(screen.getByText('Player Management')).toBeInTheDocument();
    expect(screen.getByText(/Manage player accounts, requisition points/)).toBeInTheDocument();
    
    // Wait for players to load
    await waitFor(() => {
      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    });
  });

  test('fetches and displays players on mount', async () => {
    render(<PlayerManagement authedPlayer={mockAuthedPlayer} sessionId={mockSessionId} />);
    
    // Wait for API call
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/players', {
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': mockSessionId,
          'x-gm-secret': 'bongo'
        }
      });
    });

    // Check if player is displayed
    await waitFor(() => {
      const playerName = screen.getByText('TestPlayer');
      expect(playerName).toBeInTheDocument();
      
      // Check that all expected data is rendered somewhere in the document
      const container = screen.getByText(/Player Management/);
      const documentText = container.closest('body').textContent;
      
      expect(documentText).toContain('TestPlayer');
      expect(documentText).toContain('Total XP:');
      expect(documentText).toContain('1000');
      expect(documentText).toContain('XP Spent:');
      expect(documentText).toContain('200');
      expect(documentText).toContain('Available XP:');
      expect(documentText).toContain('800');
    });
  });

  test('creates new player', async () => {
    render(<PlayerManagement authedPlayer={mockAuthedPlayer} sessionId={mockSessionId} />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Player Name')).toBeInTheDocument();
    });

    // Fill in new player form
    const nameInput = screen.getByPlaceholderText('Player Name');
    const rpInput = screen.getByPlaceholderText('Requisition Points');
    const pwInput = screen.getByPlaceholderText('Password (default: 1234)');
    const addButton = screen.getByText('Add Player');

    fireEvent.change(nameInput, { target: { value: 'NewPlayer' } });
    fireEvent.change(rpInput, { target: { value: '75' } });
    fireEvent.change(pwInput, { target: { value: 'testpass' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/players/gm/add-or-update',
        {
          name: 'NewPlayer',
          requisitionPoints: 75,
          password: 'testpass'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': mockSessionId,
            'x-gm-secret': 'bongo'
          }
        }
      );
    });
  });

  test('sets requisition points for player', async () => {
    render(<PlayerManagement authedPlayer={mockAuthedPlayer} sessionId={mockSessionId} />);
    
    await waitFor(() => {
      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    });

    // Find RP input by label
    const rpInputs = screen.getAllByDisplayValue('50');
    expect(rpInputs.length).toBeGreaterThan(0);
    
    // Find all Set buttons and click the first one (RP)
    const setButtons = screen.getAllByText('Set');
    fireEvent.click(setButtons[0]);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/players/gm/set-rp',
        {
          playerName: 'TestPlayer',
          requisitionPoints: 50
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': mockSessionId,
            'x-gm-secret': 'bongo'
          }
        }
      );
    });
  });

  test('sets experience points for player', async () => {
    render(<PlayerManagement authedPlayer={mockAuthedPlayer} sessionId={mockSessionId} />);
    
    await waitFor(() => {
      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    });

    // Find XP input by its value
    const xpInputs = screen.getAllByDisplayValue('1000');
    expect(xpInputs.length).toBeGreaterThan(0);
    
    // Find all Set buttons and click the second one (XP)
    const setButtons = screen.getAllByText('Set');
    fireEvent.click(setButtons[1]);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/players/gm/set-xp',
        {
          playerName: 'TestPlayer',
          xp: 1000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': mockSessionId,
            'x-gm-secret': 'bongo'
          }
        }
      );
    });
  });

  test('sets XP spent for player', async () => {
    render(<PlayerManagement authedPlayer={mockAuthedPlayer} sessionId={mockSessionId} />);
    
    await waitFor(() => {
      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    });

    // Find XP Spent input by its value
    const xpSpentInputs = screen.getAllByDisplayValue('200');
    expect(xpSpentInputs.length).toBeGreaterThan(0);
    
    // Find all Set buttons and click the third one (XP Spent)
    const setButtons = screen.getAllByText('Set');
    fireEvent.click(setButtons[2]);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/players/gm/set-xp-spent',
        {
          playerName: 'TestPlayer',
          xpSpent: 200
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': mockSessionId,
            'x-gm-secret': 'bongo'
          }
        }
      );
    });
  });

  test('sets renown for player', async () => {
    render(<PlayerManagement authedPlayer={mockAuthedPlayer} sessionId={mockSessionId} />);
    
    await waitFor(() => {
      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    });

    // Find renown dropdown by its value
    const renownSelect = screen.getByDisplayValue('Respected');
    
    // Find all Set buttons and click the fourth one (Renown)
    const setButtons = screen.getAllByText('Set');
    fireEvent.click(setButtons[3]);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/players/gm/set-renown',
        {
          playerName: 'TestPlayer',
          renown: 'Respected'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': mockSessionId,
            'x-gm-secret': 'bongo'
          }
        }
      );
    });
  });

  test('resets password for player', async () => {
    render(<PlayerManagement authedPlayer={mockAuthedPlayer} sessionId={mockSessionId} />);
    
    await waitFor(() => {
      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    });

    // Find password reset section
    const passwordInput = screen.getByPlaceholderText('New password (default: 1234)');
    const resetButton = screen.getByText('Reset');

    fireEvent.change(passwordInput, { target: { value: 'newpass123' } });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/players/gm/reset-password',
        {
          playerName: 'TestPlayer',
          newPassword: 'newpass123'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': mockSessionId,
            'x-gm-secret': 'bongo'
          }
        }
      );
    });
  });

  test('deletes player with confirmation', async () => {
    render(<PlayerManagement authedPlayer={mockAuthedPlayer} sessionId={mockSessionId} />);
    
    await waitFor(() => {
      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete Player');
    fireEvent.click(deleteButton);

    // Check confirmation dialog
    expect(mockConfirm).toHaveBeenCalledWith(
      'Are you sure you want to delete player TestPlayer? This cannot be undone.'
    );

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        '/api/players/gm/delete/TestPlayer',
        {
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': mockSessionId,
            'x-gm-secret': 'bongo'
          }
        }
      );
    });
  });

  test('bulk gives XP to all players', async () => {
    render(<PlayerManagement authedPlayer={mockAuthedPlayer} sessionId={mockSessionId} />);
    
    await waitFor(() => {
      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    });

    // Find bulk XP input and button
    const bulkXPInputs = screen.getAllByDisplayValue('100');
    expect(bulkXPInputs.length).toBeGreaterThan(0);
    
    const giveXPButton = screen.getByText('Give XP to All');
    
    // Change the value and click
    fireEvent.change(bulkXPInputs[0], { target: { value: '250' } });
    fireEvent.click(giveXPButton);

    // Check confirmation
    expect(mockConfirm).toHaveBeenCalledWith('Give 250 XP to all 1 players?');

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/players/gm/set-xp',
        {
          playerName: 'TestPlayer',
          xp: 1250 // 1000 + 250
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': mockSessionId,
            'x-gm-secret': 'bongo'
          }
        }
      );
    });
  });

  test('bulk gives RP to all players', async () => {
    render(<PlayerManagement authedPlayer={mockAuthedPlayer} sessionId={mockSessionId} />);
    
    await waitFor(() => {
      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    });

    // Find bulk RP input and button
    const bulkRPInputs = screen.getAllByDisplayValue('10');
    expect(bulkRPInputs.length).toBeGreaterThan(0);
    
    const giveRPButton = screen.getByText('Give RP to All');

    fireEvent.change(bulkRPInputs[0], { target: { value: '25' } });
    fireEvent.click(giveRPButton);

    // Check confirmation
    expect(mockConfirm).toHaveBeenCalledWith('Give 25 RP to all 1 players?');

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/players/gm/set-rp',
        {
          playerName: 'TestPlayer',
          requisitionPoints: 75 // 50 + 25
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': mockSessionId,
            'x-gm-secret': 'bongo'
          }
        }
      );
    });
  });

  test('handles API errors gracefully', async () => {
    // Mock API error
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { message: 'Server error' } }
    });

    render(<PlayerManagement authedPlayer={mockAuthedPlayer} sessionId={mockSessionId} />);
    
    await waitFor(() => {
      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    });

    // Try to set RP and expect error handling
    const rpInputs = screen.getAllByDisplayValue('50');
    const setButtons = screen.getAllByText('Set');

    fireEvent.change(rpInputs[0], { target: { value: '100' } });
    fireEvent.click(setButtons[0]);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to set RP for TestPlayer: Server error/)).toBeInTheDocument();
    });
  });

  test('refreshes players list', async () => {
    render(<PlayerManagement authedPlayer={mockAuthedPlayer} sessionId={mockSessionId} />);
    
    await waitFor(() => {
      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh Players');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      // Should make another API call
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });
});
