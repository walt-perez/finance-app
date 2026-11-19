import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { MarketDataProvider } from '../../shared/MarketDataProvider';
import { MarketDataError } from '../../shared/validation';
import { MockProvider } from '../services/mockProvider';
import { DashboardPage } from './DashboardPage';

const chartRenders = vi.hoisted(() => [] as string[][]);

// Pass-through wrapper that records the symbols each chart render receives.
vi.mock('../components/charts/ComparisonLineChart', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../components/charts/ComparisonLineChart')>();
  return {
    ...actual,
    ComparisonLineChart: (props: Parameters<typeof actual.ComparisonLineChart>[0]) => {
      chartRenders.push(props.series.map((x) => x.symbol));
      return actual.ComparisonLineChart(props);
    },
  };
});

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

describe('DashboardPage: user-selected company graph', () => {
  const lookup = async (symbol: string) => {
    await userEvent.type(screen.getByLabelText('Ticker symbol'), symbol);
    await userEvent.click(screen.getByRole('button', { name: 'Show graph' }));
  };

  it('shows no selected-company graph and makes no extra requests until a symbol is submitted', async () => {
    const mock = new MockProvider();
    const getHistory = vi.spyOn(mock, 'getHistory');
    render(<DashboardPage provider={mock} />);
    await screen.findByRole('table');

    expect(screen.queryByLabelText(/Selected company/)).not.toBeInTheDocument();
    const requested = getHistory.mock.calls.map(([symbol]) => symbol);
    expect(requested.sort()).toEqual(['CRM', 'IBM', 'MSFT', 'ORCL', 'SAP']);
  });

  it('loads and shows a graph for a valid user-provided symbol', async () => {
    const mock = new MockProvider();
    const getHistory = vi.spyOn(mock, 'getHistory');
    render(<DashboardPage provider={mock} />);
    await screen.findByRole('table');

    await lookup('nvda');

    const card = await screen.findByLabelText('Selected company: NVDA');
    expect(card).toHaveTextContent('Current day, rebased to 100');
    await waitFor(() => expect(card).toHaveTextContent('NVDA'));
    expect(getHistory).toHaveBeenCalledWith('NVDA', '1d');
  });

  it('shows a loading state while the selected symbol is being retrieved', async () => {
    const mock = new MockProvider();
    const pending: MarketDataProvider = {
      getQuotes: (s) => mock.getQuotes(s),
      getHistory: (symbol, window) => (symbol === 'NVDA' ? new Promise(() => {}) : mock.getHistory(symbol, window)),
    };
    render(<DashboardPage provider={pending} />);
    await screen.findByRole('table');

    await lookup('NVDA');

    const card = await screen.findByLabelText('Selected company: NVDA');
    expect(within(card).getByRole('status')).toBeInTheDocument();
  });

  it('rejects an invalid symbol with a clear message and requests nothing for it', async () => {
    const mock = new MockProvider();
    const getHistory = vi.spyOn(mock, 'getHistory');
    render(<DashboardPage provider={mock} />);
    await screen.findByRole('table');
    const before = getHistory.mock.calls.length;

    await lookup('<script>');

    expect(screen.getByRole('alert')).toHaveTextContent('is not a valid ticker symbol');
    expect(screen.queryByLabelText(/Selected company/)).not.toBeInTheDocument();
    expect(getHistory.mock.calls.length).toBe(before);
  });

  it('shows an error for a well-formed but unavailable symbol, leaving the rest of the dashboard intact', async () => {
    const mock = new MockProvider();
    const provider: MarketDataProvider = {
      getQuotes: (s) => mock.getQuotes(s),
      getHistory: (symbol, window) =>
        symbol === 'ZZZZ'
          ? Promise.reject(new MarketDataError('NOT_FOUND', 'No market data found for ZZZZ.'))
          : mock.getHistory(symbol, window),
    };
    render(<DashboardPage provider={provider} />);
    await screen.findByRole('table');

    await lookup('ZZZZ');

    const card = await screen.findByLabelText('Selected company: ZZZZ');
    expect(await within(card).findByRole('alert')).toHaveTextContent('No market data found for ZZZZ.');
    expect(screen.getByLabelText('IBM quote')).toBeInTheDocument();
    expect(screen.getByRole('table')).toHaveTextContent('IBM');
  });

  it('keeps the original dashboards visible alongside the new graph', async () => {
    render(<DashboardPage provider={new MockProvider()} />);
    await screen.findByRole('table');
    await lookup('AMD');
    await screen.findByLabelText('Selected company: AMD');

    for (const symbol of ['IBM', 'MSFT', 'ORCL', 'SAP', 'CRM']) {
      expect(screen.getByLabelText(`${symbol} quote`)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Current day comparison')).toBeInTheDocument();
    expect(screen.getByRole('table')).toHaveTextContent('Current day performance');
    expect(screen.getByLabelText('Company lookup')).toBeInTheDocument();
  });

  it("never renders the previous symbol's data under a newly selected symbol", async () => {
    const mock = new MockProvider();
    const provider: MarketDataProvider = {
      getQuotes: (s) => mock.getQuotes(s),
      getHistory: (symbol, window) => (symbol === 'AMD' ? new Promise(() => {}) : mock.getHistory(symbol, window)),
    };
    render(<DashboardPage provider={provider} />);
    await screen.findByRole('table');
    await lookup('NVDA');
    await waitFor(() => expect(chartRenders.some((r) => r.join() === 'NVDA')).toBe(true));

    chartRenders.length = 0; // from here on, record only renders caused by switching to AMD
    await userEvent.clear(screen.getByLabelText('Ticker symbol'));
    await lookup('AMD');
    await screen.findByLabelText('Selected company: AMD');

    expect(chartRenders.length).toBeGreaterThan(0);
    expect(chartRenders.filter((symbols) => symbols.includes('NVDA'))).toEqual([]);
  });

  it('follows the selected time window and can switch to a different symbol', async () => {
    const mock = new MockProvider();
    const getHistory = vi.spyOn(mock, 'getHistory');
    render(<DashboardPage provider={mock} />);
    await screen.findByRole('table');

    await lookup('NVDA');
    await screen.findByLabelText('Selected company: NVDA');

    await userEvent.click(screen.getByRole('tab', { name: 'Last quarter' }));
    await waitFor(() => expect(getHistory).toHaveBeenCalledWith('NVDA', '3m'));
    expect(screen.getByLabelText('Selected company: NVDA')).toHaveTextContent('Last quarter, rebased to 100');

    await userEvent.clear(screen.getByLabelText('Ticker symbol'));
    await lookup('AMD');
    expect(await screen.findByLabelText('Selected company: AMD')).toBeInTheDocument();
    expect(screen.queryByLabelText('Selected company: NVDA')).not.toBeInTheDocument();
    await waitFor(() => expect(getHistory).toHaveBeenCalledWith('AMD', '3m'));
  });
});
