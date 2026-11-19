import type { MarketDataProvider } from '../../shared/MarketDataProvider';
import type { ApiErrorBody, Quote, Series, TimeWindow } from '../../shared/types';
import { MarketDataError } from '../../shared/validation';

async function getJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new MarketDataError('NETWORK_ERROR', 'Could not reach the market data service.');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    if (!body) {
      // Our API always answers errors with JSON, so a bare failure means the API never replied
      // (e.g. the dev proxy cannot reach it).
      throw new MarketDataError(
        'UPSTREAM_ERROR',
        `Market data service unavailable (HTTP ${res.status}). Is the API server running? Start it with "npm run dev:server".`,
      );
    }
    throw new MarketDataError(body.code ?? 'UPSTREAM_ERROR', body.message ?? `Request failed (${res.status}).`);
  }
  return (await res.json()) as T;
}

/** Talks to the Express proxy in /server, which in turn calls Yahoo Finance. */
export class ApiProvider implements MarketDataProvider {
  getQuotes(symbols: string[]): Promise<Quote[]> {
    return getJson(`/api/quotes?symbols=${encodeURIComponent(symbols.join(','))}`);
  }

  getHistory(symbol: string, window: TimeWindow): Promise<Series> {
    return getJson(`/api/history?symbol=${encodeURIComponent(symbol)}&window=${window}`);
  }
}
