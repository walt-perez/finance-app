import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { MarketDataProvider } from '../../shared/MarketDataProvider';
import { MarketDataError } from '../../shared/validation';
import { MockProvider } from '../services/mockProvider';
import { DashboardPage } from './DashboardPage';

describe('DashboardPage', () => {
  it('renders quotes for all five companies and the ranking', async () => {
    render(<DashboardPage provider={new MockProvider()} />);

    expect(await screen.findByLabelText('IBM quote')).toBeInTheDocument();
    for (const symbol of ['MSFT', 'ORCL', 'SAP', 'CRM']) {
      expect(screen.getByLabelText(`${symbol} quote`)).toBeInTheDocument();
    }
    expect(await screen.findByRole('table')).toHaveTextContent('Current day performance');
  });

  it('requests new history when the time window changes', async () => {
    const mock = new MockProvider();
    const getHistory = vi.spyOn(mock, 'getHistory');
    render(<DashboardPage provider={mock} />);
    await screen.findByRole('table');

    await userEvent.click(screen.getByRole('tab', { name: 'Last quarter' }));

    await waitFor(() => expect(getHistory).toHaveBeenCalledWith('IBM', '3m'));
    expect(await screen.findByRole('table')).toHaveTextContent('Last quarter performance');
  });

  it('names symbols that have no quote while rendering the rest', async () => {
    const mock = new MockProvider();
    const partial: MarketDataProvider = {
      getQuotes: async (s) => (await mock.getQuotes(s)).filter((q) => q.symbol !== 'ORCL'),
      getHistory: (symbol, window) => mock.getHistory(symbol, window),
    };
    render(<DashboardPage provider={partial} />);

    expect(await screen.findByText('No quote available for: ORCL')).toBeInTheDocument();
    expect(screen.getByLabelText('IBM quote')).toBeInTheDocument();
    expect(screen.queryByLabelText('ORCL quote')).not.toBeInTheDocument();
  });

  it('shows the quotes error and per-symbol history errors when the service is down', async () => {
    const down: MarketDataProvider = {
      getQuotes: () => Promise.reject(new MarketDataError('NETWORK_ERROR', 'Could not reach the market data service.')),
      getHistory: () => Promise.reject(new MarketDataError('NETWORK_ERROR', 'Could not reach the market data service.')),
    };
    render(<DashboardPage provider={down} />);

    // One alert for the quotes card, one for the history card.
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2));
    const [quotesAlert, historyAlert] = screen.getAllByRole('alert');
    expect(quotesAlert).toHaveTextContent('Could not reach the market data service.');
    expect(historyAlert).toHaveTextContent(/Unavailable: IBM .*MSFT .*ORCL .*SAP .*CRM/);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    // The page shell stays usable so the user can switch windows and retry.
    expect(screen.getByRole('tab', { name: 'Last 7 days' })).toBeEnabled();
  });

  it('shows loading states before data arrives', async () => {
    const never: MarketDataProvider = {
      getQuotes: () => new Promise(() => {}),
      getHistory: () => new Promise(() => {}),
    };
    render(<DashboardPage provider={never} />);
    expect(screen.getAllByRole('status').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a partial error when one symbol fails but still renders the others', async () => {
    const mock = new MockProvider();
    const failing: MarketDataProvider = {
      getQuotes: (s) => mock.getQuotes(s),
      getHistory: (symbol, window) =>
        symbol === 'SAP'
          ? Promise.reject(new MarketDataError('UPSTREAM_ERROR', 'boom'))
          : mock.getHistory(symbol, window),
    };
    render(<DashboardPage provider={failing} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('SAP (boom)');
    expect(await screen.findByRole('table')).not.toHaveTextContent('SAP');
  });
});
