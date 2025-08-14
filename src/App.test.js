import { render, screen } from '@testing-library/react';
import App from './App';

test('renders deathwatch roller app', () => {
  render(<App />);
  const titleElement = screen.getByText(/Deathwatch Roller Pro/i);
  expect(titleElement).toBeInTheDocument();
});
