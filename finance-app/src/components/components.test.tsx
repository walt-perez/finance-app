import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Quote, Series } from '../../shared/types';
import { QuoteCard } from './cards/QuoteCard';
import { ChartCard } from './charts/ChartCard';
import { ComparisonLineChart } from './charts/ComparisonLineChart';
import { EmptyState, ErrorState, LoadingState } from './feedback/States';
import { WindowTabs } from './layout/WindowTabs';
import { PerformanceTable } from './ranking/PerformanceTable';

const quote = (over: Partial<Quote> = {}): Quote => ({
  symbol: 'IBM',
  name: 'IBM Corp',
  price: 226.4,
  change: -2.1,
  changePercent: -0.92,
  currency: 'USD',
  ...over,
});

const series = (symbol: string, closes: (number | null)[]): Series => ({
  symbol,
  window: '7d',
  points: closes.map((close, i) => ({ time: `2026-01-0${i + 1}T00:00:00.000Z`, close })),
});

describe('QuoteCard', () => {
  it('shows price, currency and a down arrow for a negative change', () => {
    render(<QuoteCard quote={quote()} />);
    const card = screen.getByLabelText('IBM quote');
    expect(card).toHaveTextContent('226.40');
    expect(card).toHaveTextContent('USD');
    expect(card).toHaveTextContent('▼ 2.10 (-0.92%)');
    expect(card.querySelector('.down')).not.toBeNull();
  });

  it('shows an up arrow for a positive or zero change', () => {
    render(<QuoteCard quote={quote({ change: 1.5, changePercent: 0.7 })} />);
    expect(screen.getByLabelText('IBM quote')).toHaveTextContent('▲ 1.50 (0.70%)');
    render(<QuoteCard quote={quote({ symbol: 'SAP', change: 0, changePercent: 0 })} />);
    expect(screen.getByLabelText('SAP quote').querySelector('.up')).not.toBeNull();
  });
});

describe('ChartCard', () => {
  it('renders children by default', () => {
    render(<ChartCard title="T">content</ChartCard>);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('shows the subtitle when given', () => {
    render(<ChartCard title="T" subtitle="sub">content</ChartCard>);
    expect(screen.getByText('sub')).toBeInTheDocument();
  });

  it('shows only the loading state while loading, even if an error is also set', () => {
    render(<ChartCard title="T" loading error="bad">content</ChartCard>);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('shows the error instead of children, and prefers it over empty', () => {
    render(<ChartCard title="T" error="bad" empty>content</ChartCard>);
    expect(screen.getByRole('alert')).toHaveTextContent('bad');
    expect(screen.queryByText('No data available.')).not.toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('shows the empty state instead of children', () => {
    render(<ChartCard title="T" empty>content</ChartCard>);
    expect(screen.getByText('No data available.')).toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });
});

describe('feedback states', () => {
  it('expose the right accessibility roles', () => {
    render(
      <>
        <LoadingState />
        <ErrorState message="oops" />
        <EmptyState message="nothing" />
      </>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(screen.getByRole('alert')).toHaveTextContent('oops');
    expect(screen.getByText('nothing')).toBeInTheDocument();
  });
});

describe('WindowTabs', () => {
  it('marks the active tab and reports clicks on the others', async () => {
    const onChange = vi.fn();
    render(<WindowTabs value="7d" onChange={onChange} />);

    expect(screen.getByRole('tab', { name: 'Last 7 days' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Current day' })).toHaveAttribute('aria-selected', 'false');

    await userEvent.click(screen.getByRole('tab', { name: 'Last quarter' }));
    expect(onChange).toHaveBeenCalledWith('3m');
  });
});

describe('PerformanceTable', () => {
  it('ranks best to worst, formats percentages and marks unavailable symbols n/a', () => {
    render(
      <PerformanceTable
        label="Test performance"
        series={[series('AAA', [100, 105]), series('BBB', [100, 120]), series('CCC', [null, null])]}
      />,
    );
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((r) => r.textContent)).toEqual(['1BBB20.00%', '2AAA5.00%', '3CCCn/a']);
    expect(screen.getByRole('table')).toHaveTextContent('Test performance');
  });
});

describe('ComparisonLineChart', () => {
  it('renders one legend entry per series, using company names', () => {
    render(<ComparisonLineChart window="7d" series={[series('IBM', [100, 101]), series('MSFT', [200, 210])]} />);
    expect(screen.getByText('IBM')).toBeInTheDocument();
    expect(screen.getByText('Microsoft')).toBeInTheDocument();
  });

  it('falls back to the symbol for companies that are not configured', () => {
    render(<ComparisonLineChart window="1d" series={[series('ZZZ', [100, 101])]} />);
    expect(screen.getByText('ZZZ')).toBeInTheDocument();
  });
});
