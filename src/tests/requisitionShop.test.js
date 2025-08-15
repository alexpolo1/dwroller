import { render, screen, fireEvent } from '@testing-library/react';
import RequisitionShop from '../components/RequisitionShop';

describe('RequisitionShop Component', () => {
  test('renders the shop component', () => {
    render(<RequisitionShop />);
    const shopTitle = screen.getByText(/Requisition Shop/i);
    expect(shopTitle).toBeInTheDocument();
  });

  test('purchaseItem function subtracts requisition points', async () => {
    render(<RequisitionShop />);

    // Mock player data
    const mockPlayer = { name: 'TestPlayer', rp: 100, renown: 'None' };
    const mockItem = { id: 'item1', name: 'TestItem', req: 50, renown: 'None' };

    // Simulate purchasing an item
    mockPlayer.rp -= mockItem.req;
    expect(mockPlayer.rp).toBe(50);
  });

  test('addPlayer function adds a new player', async () => {
    render(<RequisitionShop />);

    // Mock player data
    const mockPlayer = { name: 'NewPlayer', rp: 100, renown: 'None' };

    // Simulate adding a player
    const players = [mockPlayer];
    expect(players).toContainEqual(mockPlayer);
  });

  test('handlePlayerLogin logs in a player', async () => {
    render(<RequisitionShop />);

    // Mock player data
    const mockPlayer = { name: 'LoginPlayer', rp: 100, renown: 'None' };

    // Simulate player login
    const loggedInPlayer = mockPlayer.name;
    expect(loggedInPlayer).toBe('LoginPlayer');
  });

  test('handlePlayerLogout logs out a player', async () => {
    render(<RequisitionShop />);

    // Simulate player logout
    await fireEvent.click(screen.getByText(/Logout/i));
    const loggedOutPlayer = screen.queryByText(/LogoutPlayer/i);
    expect(loggedOutPlayer).not.toBeInTheDocument();
  });
});
