import type { PricePoint, Quote, Series, TimeWindow } from '../../shared/types';

/** The subset of a Yahoo quote we read. Kept structural so tests don't need Yahoo types. */
export interface RawQuote {
  symbol: string;
  shortName?: string | null;
  longName?: string | null;
  currency?: string | null;
  regularMarketPrice?: number | null;
  regularMarketChange?: number | null;
  regularMarketChangePercent?: number | null;
}

/** The subset of a Yahoo chart bar we read. */
export interface RawBar {
  date: Date;
  close?: number | null;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Normalize a Yahoo quote. Returns null if any numeric field is missing,
 * so the UI shows the symbol as unavailable instead of a fabricated 0.00.
 */
export function mapQuote(raw: RawQuote): Quote | null {
  const { regularMarketPrice: price, regularMarketChange: change, regularMarketChangePercent: pct } = raw;
  if (!isNum(price) || !isNum(change) || !isNum(pct)) return null;
  return {
    symbol: raw.symbol,
    name: raw.shortName ?? raw.longName ?? raw.symbol,
    price,
    change,
    changePercent: pct,
    currency: raw.currency ?? 'USD',
  };
}

/** Calendar date (YYYY-MM-DD) of an instant in the given IANA timezone. */
export function exchangeDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/**
 * Normalize chart bars into a Series.
 * - Non-finite closes become null (kept, so timestamps stay aligned across symbols).
 * - For '1d', keep only the latest trading session, judged in the exchange's own
 *   timezone, so weekends and holidays fall back to the last session that had data.
 */
export function mapChart(symbol: string, window: TimeWindow, bars: RawBar[], timeZone: string): Series {
  let selected = bars;
  if (window === '1d' && bars.length > 0) {
    const lastDay = exchangeDate(bars[bars.length - 1].date, timeZone);
    selected = bars.filter((b) => exchangeDate(b.date, timeZone) === lastDay);
  }
  const points: PricePoint[] = selected.map((b) => ({
    time: b.date.toISOString(),
    close: isNum(b.close) ? b.close : null,
  }));
  return { symbol, window, points };
}

/** Order quotes the way the caller asked for them (Yahoo's batch order is not guaranteed). */
export function orderLike(quotes: Quote[], symbols: string[]): Quote[] {
  const rank = new Map(symbols.map((s, i) => [s, i]));
  return [...quotes].sort((a, b) => (rank.get(a.symbol) ?? Infinity) - (rank.get(b.symbol) ?? Infinity));
}

/** True when a series has at least one usable close. */
export function hasData(series: Series): boolean {
  return series.points.some((p) => p.close !== null);
}
