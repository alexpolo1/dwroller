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
      requisitionPoints: 50,
      xp: 1000,
      xpSpent: 200,
      renown: 'Respected',
      charName: 'Brother Testicus'
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
      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
      expect(screen.getByText('Respected • RP: 50')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument(); // Total XP
      expect(screen.getByText('200')).toBeInTheDocument(); // XP Spent
      expect(screen.getByText('800')).toBeInTheDocument(); // Available XP
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

    // Find RP management section and use current RP value (50)
    const rpInputs = screen.getAllByDisplayValue('50');
    const rpInput = rpInputs.find(input => input.type === 'number');
    const rpSetButtons = screen.getAllByText('Set');
    const rpSetButton = rpSetButtons[0]; // First Set button should be for RP

    // Click set button with current value
    fireEvent.click(rpSetButton);

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

    // Find XP management section and use current XP value (1000)
    const xpInputs = screen.getAllByDisplayValue('1000');
    const xpInput = xpInputs.find(input => input.type === 'number');
    const xpSetButtons = screen.getAllByText('Set');
    const xpSetButton = xpSetButtons[1]; // Second Set button should be for XP

    // Click set button with current value
    fireEvent.click(xpSetButton);

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

    // Find XP Spent management section and use current value (200)
    const xpSpentInputs = screen.getAllByDisplayValue('200');
    const xpSpentInput = xpSpentInputs.find(input => input.type === 'number');
    const xpSpentSetButtons = screen.getAllByText('Set');
    const xpSpentSetButton = xpSpentSetButtons[2]; // Third Set button should be for XP Spent

    // Click set button with current value
    fireEvent.click(xpSpentSetButton);

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

    // Find renown dropdown and use current value (Respected)
    const renownSelect = screen.getByDisplayValue('Respected');
    const renownSetButtons = screen.getAllByText('Set');
    const renownSetButton = renownSetButtons[3]; // Fourth Set button should be for Renown

    // Click set button with current value
    fireEvent.click(renownSetButton);

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

    // Find bulk XP giver
    const bulkXPInput = screen.getByDisplayValue('100');
    const giveXPButton = screen.getByText('Give XP to All');

    fireEvent.change(bulkXPInput, { target: { value: '250' } });
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

    // Find bulk RP giver
    const bulkRPInput = screen.getByDisplayValue('10');
    const giveRPButton = screen.getByText('Give RP to All');

    fireEvent.change(bulkRPInput, { target: { value: '25' } });
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
    const rpInput = rpInputs.find(input => input.type === 'number');
    const rpSetButtons = screen.getAllByText('Set');
    const rpSetButton = rpSetButtons[0];

    fireEvent.change(rpInput, { target: { value: '100' } });
    fireEvent.click(rpSetButton);

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
