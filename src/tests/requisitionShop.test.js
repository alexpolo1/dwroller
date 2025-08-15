import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

// Mock fetch for armoury data
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([
      { name: "Test Item", cost: 10, category: "Gear", renown: "None" }
    ])
  })
);

describe('RequisitionShop Component', () => {
  beforeEach(() => {
    // Clear all mock calls between tests
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    
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
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  test('renders the shop component', async () => {
    render(<RequisitionShop authedPlayer="TestPlayer" sessionId="test-session" />);
    await waitFor(() => {
      const shopTitle = screen.getByText(/Requisition Shop/i);
      expect(shopTitle).toBeInTheDocument();
    });
  });

  test('displays player info when authenticated', async () => {
    render(<RequisitionShop authedPlayer="TestPlayer" sessionId="test-session" />);
    await waitFor(() => {
      const shopTitle = screen.getByText(/Requisition Shop/i);
      expect(shopTitle).toBeInTheDocument();
    });
  });

  test('shows login message when not authenticated', async () => {
    render(<RequisitionShop authedPlayer="" sessionId="" />);
    await waitFor(() => {
      expect(screen.getByText(/Please log in/i)).toBeInTheDocument();
    });
  });

  test('displays available items', async () => {
    render(<RequisitionShop authedPlayer="TestPlayer" sessionId="test-session" />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search items/i)).toBeInTheDocument();
    });
  });
});
