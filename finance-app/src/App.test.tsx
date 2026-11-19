import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the dashboard using the default offline data source', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'IBM Market Dashboard' })).toBeInTheDocument();
    expect(await screen.findByLabelText('IBM quote')).toBeInTheDocument();
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });
});
