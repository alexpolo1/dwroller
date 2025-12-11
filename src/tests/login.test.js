import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import App from '../App';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('Login Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Mock axios to handle different endpoints
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/api/players/names') {
        return Promise.resolve({
          data: [
            { name: 'gm' },
            { name: 'anders' },
            { name: 'phillip' }
          ]
        });
      }
      // For other GET requests (like /api/players/{name})
      return Promise.resolve({
        data: {
          name: 'gm',
          tabInfo: {
            rp: 100,
            xp: 1000,
            xpSpent: 200,
            renown: 'Respected',
            charName: 'Game Master'
          }
        }
      });
    });
    
    // Default POST mock - will be overridden per test with mockResolvedValueOnce
    mockedAxios.post.mockImplementation((url, data) => {
      if (url === '/api/players/login') {
        return Promise.resolve({
          data: {
            success: true,
            sessionId: 'default_session_id',
            player: { name: data.name }
          },
          status: 200
        });
      }
      return Promise.resolve({ status: 200 });
    });
  });

  test('login with GM account', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        sessionId: 'session_gm_12345',
        player: { name: 'gm' }
      },
      status: 200
    });

    render(<App />);

    // Wait for players list to load
    await waitFor(() => {
      expect(screen.getByText(/gm/i)).toBeInTheDocument();
    });

    // Find login inputs
    const nameInput = screen.getByPlaceholderText(/player name|username/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login|enter/i });

    // Fill in login form with GM credentials
    fireEvent.change(nameInput, { target: { value: 'gm' } });
    fireEvent.change(passwordInput, { target: { value: 'bongo' } });

    // Click login button
    fireEvent.click(loginButton);

    // Verify login was called with correct parameters
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/players/login',
        {
          name: 'gm',
          password: 'bongo'
        }
      );
    });

    // Verify success message appears
    await waitFor(() => {
      expect(screen.getByText(/login successful/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('login with invalid password fails', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: {
        status: 401,
        data: { error: 'Invalid password' }
      },
      message: 'Request failed with status code 401'
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/gm/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/player name|username/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login|enter/i });

    fireEvent.change(nameInput, { target: { value: 'gm' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong_password' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument();
    });
  });

  test('login with non-existent player fails', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: {
        status: 404,
        data: { error: 'Player not found' }
      },
      message: 'Request failed with status code 404'
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/gm/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/player name|username/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login|enter/i });

    fireEvent.change(nameInput, { target: { value: 'nonexistent' } });
    fireEvent.change(passwordInput, { target: { value: '1234' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument();
    });
  });
});
