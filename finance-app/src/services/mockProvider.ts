import type { MarketDataProvider } from '../../shared/MarketDataProvider';
import type { PricePoint, Quote, Series, TimeWindow } from '../../shared/types';
import { normalizeSymbol } from '../../shared/validation';
import { COMPANIES } from '../config/companies';

const BASE_PRICES: Record<string, number> = { IBM: 190, MSFT: 420, ORCL: 140, SAP: 210, CRM: 270 };

/** Deterministic pseudo-random generator so the same symbol always yields the same shape. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const WINDOW_SHAPE: Record<TimeWindow, { count: number; stepMs: number }> = {
  '1d': { count: 78, stepMs: 5 * 60_000 },
  '7d': { count: 7 * 8, stepMs: 60 * 60_000 },
  '3m': { count: 90, stepMs: 24 * 60 * 60_000 },
};

function priceFor(symbol: string): number {
  return BASE_PRICES[symbol] ?? 100;
}

/** Offline provider with synthetic data, for demos, development and tests. */
export class MockProvider implements MarketDataProvider {
  async getQuotes(symbols: string[]): Promise<Quote[]> {
    return symbols.map((raw) => {
      const symbol = normalizeSymbol(raw);
      const rand = seeded(`${symbol}:quote`);
      const price = priceFor(symbol);
      const changePercent = (rand() - 0.5) * 4;
      return {
        symbol,
        name: COMPANIES.find((c) => c.symbol === symbol)?.name ?? symbol,
        price: Number(price.toFixed(2)),
        change: Number(((price * changePercent) / 100).toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        currency: 'USD',
      };
    });
  }

  async getHistory(raw: string, window: TimeWindow): Promise<Series> {
    const symbol = normalizeSymbol(raw);
    const { count, stepMs } = WINDOW_SHAPE[window];
    const rand = seeded(`${symbol}:${window}`);
    const end = Date.now();
    let price = priceFor(symbol);
    const points: PricePoint[] = [];
    for (let i = 0; i < count; i++) {
      price *= 1 + (rand() - 0.48) * 0.01;
      points.push({
        time: new Date(end - (count - 1 - i) * stepMs).toISOString(),
        close: Number(price.toFixed(2)),
      });
    }
    return { symbol, window, points };
  }
}
