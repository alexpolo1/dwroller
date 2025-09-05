import * as React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import RequisitionShop from '../components/RequisitionShop';
import '@testing-library/jest-dom';
import axios from 'axios';

// Mock axios
jest.mock('axios');

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

global.localStorage = mockLocalStorage;

describe('RequisitionShop Component', () => {
  beforeEach(() => {
    // Clear all mock calls between tests
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Reset fetch mock to return successful responses for shop data
    fetch.mockImplementation((url) => {
      if (url.includes('/api/shop/items') || url.includes('/deathwatch-armoury.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { name: "Test Item", cost: 10, category: "Gear", renown: "None" }
          ])
        });
      }
      // Default to failure for other endpoints
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({})
      });
    });
    
    // Mock axios responses
    axios.get.mockImplementation((url) => {
      if (url === '/api/players') {
        return Promise.resolve({ 
          data: [{
            name: 'TestPlayer',
            tabInfo: { rp: 100, renown: 'None' }
          }]
        });
      }
      if (url === '/api/shop/items') {
        return Promise.resolve({
          data: [
            { name: "Test Item", cost: 10, category: "Gear", renown: "None" }
          ]
        });
      }
      if (url === '/api/players/names') {
        return Promise.resolve({
          data: [
            { name: 'TestPlayer', tabInfo: { rp: 100, renown: 'None' } }
          ]
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  test('renders the shop component', async () => {
    await act(async () => {
      render(<RequisitionShop authedPlayer="TestPlayer" sessionId="test-session" />);
    });
    
    await waitFor(() => {
      const shopTitle = screen.getByText(/Requisition Shop/i);
      expect(shopTitle).toBeInTheDocument();
    });
  });

  test('displays player info when authenticated', async () => {
    await act(async () => {
      render(<RequisitionShop authedPlayer="TestPlayer" sessionId="test-session" />);
    });
    
    await waitFor(() => {
      const shopTitle = screen.getByText(/Requisition Shop/i);
      expect(shopTitle).toBeInTheDocument();
    });
  });

  test('shows login message when not authenticated', async () => {
    await act(async () => {
      render(<RequisitionShop authedPlayer="" sessionId="" />);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Please log in/i)).toBeInTheDocument();
    });
  });

  test('displays available items', async () => {
    await act(async () => {
      render(<RequisitionShop authedPlayer="TestPlayer" sessionId="test-session" />);
    });
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search items/i)).toBeInTheDocument();
    });
  });
});
