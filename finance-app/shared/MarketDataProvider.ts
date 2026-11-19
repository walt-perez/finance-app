import type { Quote, Series, TimeWindow } from './types';

/**
 * The single seam between the app and any market data source.
 * Implemented by the mock (src), the HTTP client (src) and Yahoo (server).
 */
export interface MarketDataProvider {
  getQuotes(symbols: string[]): Promise<Quote[]>;
  getHistory(symbol: string, window: TimeWindow): Promise<Series>;
}
