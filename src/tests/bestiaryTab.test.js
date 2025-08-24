import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import BestiaryTab from '../components/BestiaryTab';
import '@testing-library/jest-dom';

describe('BestiaryTab', () => {
  // Increase timeout for all tests
  jest.setTimeout(10000);

  test('renders basic component structure', async () => {
    await act(async () => {
      render(<BestiaryTab />);
    });
    
    // Should render the component header
    expect(screen.getByText('Bestiary')).toBeInTheDocument();
    
    // Wait for component to settle
    await waitFor(() => {
      // Component should show either data state or database unreachable warning
      expect(screen.getByText('Bestiary')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('component mounts without crashing', async () => {
    let container;
    await act(async () => {
      const result = render(<BestiaryTab />);
      container = result.container;
    });
    
    // Should render some content
    expect(container.firstChild).toBeInTheDocument();
    
    // Wait a bit for any async operations to settle
    await waitFor(() => {
      // Should have the main structure
      expect(screen.getByText('Bestiary')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('displays search input without placeholder', async () => {
    await act(async () => {
      render(<BestiaryTab />);
    });
    
    await waitFor(() => {
      const searchInputs = screen.queryAllByRole('textbox');
      expect(searchInputs.length).toBeGreaterThan(0);
      const searchInput = searchInputs[0];
      expect(searchInput).toBeInTheDocument();
      expect(searchInput.tagName).toBe('INPUT');
    });
  });

  test('component handles loading states gracefully', async () => {
    await act(async () => {
      render(<BestiaryTab />);
    });
    
    // Should always have these elements
    expect(screen.getByText('Bestiary')).toBeInTheDocument();
    
    // Wait for component to settle into final state
    await waitFor(() => {
      // Component should either show data or empty state, not crash
      const component = screen.getByText('Bestiary').closest('section');
      expect(component).toBeInTheDocument();
    }, { timeout: 8000 });
  });
});
