import { useState } from 'react';
import type { MarketDataProvider } from '../../shared/MarketDataProvider';
import type { TimeWindow } from '../../shared/types';
import { QuoteCard } from '../components/cards/QuoteCard';
import { ChartCard } from '../components/charts/ChartCard';
import { ComparisonLineChart } from '../components/charts/ComparisonLineChart';
import { WINDOW_LABELS, WindowTabs } from '../components/layout/WindowTabs';
import { PerformanceTable } from '../components/ranking/PerformanceTable';
import { SYMBOLS } from '../config/companies';
import { useHistory } from '../hooks/useHistory';
import { useQuotes } from '../hooks/useQuotes';
import { marketData } from '../services';

interface Props {
  /** Injectable for tests; defaults to the configured data source. */
  provider?: MarketDataProvider;
}

/** The only component that composes data hooks with presentational pieces. */
export function DashboardPage({ provider = marketData }: Props) {
  const [window, setWindow] = useState<TimeWindow>('1d');
  const quotes = useQuotes(provider, SYMBOLS);
  const history = useHistory(provider, window, SYMBOLS);

  const partialError = history.errors.length
    ? `Unavailable: ${history.errors.map((e) => `${e.symbol} (${e.message})`).join('; ')}`
    : null;
  const allFailed = !history.loading && history.series.length === 0 && history.errors.length > 0;
  const quotedSymbols = new Set(quotes.quotes.map((q) => q.symbol));
  const missingQuotes = quotes.loading || quotes.error ? [] : SYMBOLS.filter((s) => !quotedSymbols.has(s));

  return (
    <main className="dashboard">
      <h1>IBM Market Dashboard</h1>

      <ChartCard title="Current quotes" loading={quotes.loading} error={quotes.error} empty={quotes.quotes.length === 0}>
        {missingQuotes.length > 0 && (
          <p role="alert" className="state state-error">
            No quote available for: {missingQuotes.join(', ')}
          </p>
        )}
        <div className="quote-grid">
          {quotes.quotes.map((q) => (
            <QuoteCard key={q.symbol} quote={q} />
          ))}
        </div>
      </ChartCard>

      <WindowTabs value={window} onChange={setWindow} />

      <ChartCard
        title={`${WINDOW_LABELS[window]} comparison`}
        subtitle="Prices rebased to 100 at the start of the period"
        loading={history.loading}
        error={allFailed ? partialError : null}
        empty={history.series.length === 0}
      >
        {partialError && <p role="alert" className="state state-error">{partialError}</p>}
        <ComparisonLineChart series={history.series} window={window} />
      </ChartCard>

      <ChartCard title="Ranking" loading={history.loading} empty={history.series.length === 0}>
        <PerformanceTable series={history.series} label={`${WINDOW_LABELS[window]} performance`} />
      </ChartCard>
    </main>
  );
}
