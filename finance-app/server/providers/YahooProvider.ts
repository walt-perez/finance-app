import YahooFinance from 'yahoo-finance2';
import type { MarketDataProvider } from '../../shared/MarketDataProvider';
import type { Quote, Series, TimeWindow } from '../../shared/types';
import { MarketDataError } from '../../shared/validation';
import { WINDOW_QUERIES } from '../windows';
import { hasData, mapChart, mapQuote, orderLike } from './yahooMapping';

const DAY_MS = 24 * 60 * 60 * 1000;

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

function toMarketDataError(err: unknown, symbol?: string): MarketDataError {
  if (err instanceof MarketDataError) return err;
  const message = err instanceof Error ? err.message : String(err);
  if (/not found|no data|delisted/i.test(message)) {
    return new MarketDataError('NOT_FOUND', `No market data found${symbol ? ` for ${symbol}` : ''}.`);
  }
  if (/429|too many/i.test(message)) {
    return new MarketDataError('RATE_LIMITED', 'Yahoo Finance rate limit reached. Try again shortly.');
  }
  return new MarketDataError('UPSTREAM_ERROR', 'Yahoo Finance request failed.');
}

export class YahooProvider implements MarketDataProvider {
  /**
   * One batched request. Yahoo silently omits unknown symbols, so the result may be
   * shorter than the input; callers compare against what they asked for.
   * Throws NOT_FOUND only when nothing at all could be quoted.
   */
  async getQuotes(symbols: string[]): Promise<Quote[]> {
    try {
      const raw = await yahooFinance.quote(symbols);
      const quotes = raw
        .filter((q): q is typeof q & { symbol: string } => 'symbol' in q && typeof q.symbol === 'string')
        .map(mapQuote)
        .filter((q): q is Quote => q !== null);
      if (quotes.length === 0) {
        throw new MarketDataError('NOT_FOUND', `No quotes found for ${symbols.join(', ')}.`);
      }
      return orderLike(quotes, symbols);
    } catch (err) {
      throw toMarketDataError(err);
    }
  }

  async getHistory(symbol: string, window: TimeWindow): Promise<Series> {
    const { lookbackDays, interval } = WINDOW_QUERIES[window];
    try {
      const chart = await yahooFinance.chart(symbol, {
        period1: new Date(Date.now() - lookbackDays * DAY_MS),
        interval,
        // Regular hours only: extended-hours coverage differs by ticker and skews comparisons.
        includePrePost: false,
      });
      const series = mapChart(symbol, window, chart.quotes, chart.meta.exchangeTimezoneName ?? 'America/New_York');
      if (!hasData(series)) throw new MarketDataError('NOT_FOUND', `No history found for ${symbol}.`);
      return series;
    } catch (err) {
      throw toMarketDataError(err, symbol);
    }
  }
}
