import { describe, expect, it } from 'vitest';
import type { Quote } from '../../shared/types';
import { exchangeDate, hasData, mapChart, mapQuote, orderLike, type RawBar } from './yahooMapping';

const NY = 'America/New_York';
const bar = (iso: string, close: number | null | undefined): RawBar => ({ date: new Date(iso), close });

describe('mapQuote', () => {
  const raw = {
    symbol: 'IBM',
    shortName: 'Intl Business Machines',
    currency: 'USD',
    regularMarketPrice: 226.4,
    regularMarketChange: -2.1,
    regularMarketChangePercent: -0.92,
  };

  it('maps a complete quote', () => {
    expect(mapQuote(raw)).toEqual({
      symbol: 'IBM',
      name: 'Intl Business Machines',
      price: 226.4,
      change: -2.1,
      changePercent: -0.92,
      currency: 'USD',
    });
  });

  it('falls back to longName, then symbol, and defaults currency', () => {
    expect(mapQuote({ ...raw, shortName: null, longName: 'Long Name', currency: undefined })).toMatchObject({
      name: 'Long Name',
      currency: 'USD',
    });
    expect(mapQuote({ ...raw, shortName: undefined, longName: undefined })?.name).toBe('IBM');
  });

  it.each(['regularMarketPrice', 'regularMarketChange', 'regularMarketChangePercent'] as const)(
    'returns null instead of fabricating zero when %s is missing',
    (field) => {
      expect(mapQuote({ ...raw, [field]: undefined })).toBeNull();
      expect(mapQuote({ ...raw, [field]: NaN })).toBeNull();
    },
  );
});

describe('orderLike', () => {
  it('follows the requested order and puts unknown symbols last', () => {
    const q = (symbol: string) => ({ symbol }) as Quote;
    const ordered = orderLike([q('SAP'), q('XXX'), q('IBM'), q('MSFT')], ['IBM', 'MSFT', 'SAP']);
    expect(ordered.map((x) => x.symbol)).toEqual(['IBM', 'MSFT', 'SAP', 'XXX']);
  });
});

describe('exchangeDate', () => {
  it('uses the exchange timezone, not UTC', () => {
    // 02:00 UTC on the 20th is still the evening of the 19th in New York.
    expect(exchangeDate(new Date('2026-11-20T02:00:00Z'), NY)).toBe('2026-11-19');
    expect(exchangeDate(new Date('2026-11-20T02:00:00Z'), 'UTC')).toBe('2026-11-20');
  });
});

describe('mapChart', () => {
  it('keeps only the latest session for 1d (weekend fallback to Friday)', () => {
    const series = mapChart(
      'IBM',
      '1d',
      [
        bar('2026-11-19T15:00:00Z', 1),
        bar('2026-11-20T15:00:00Z', 2),
        bar('2026-11-20T20:55:00Z', 3),
      ],
      NY,
    );
    expect(series.points.map((p) => p.close)).toEqual([2, 3]);
  });

  it('does not split a US session at UTC midnight', () => {
    // 16:00 ET and 20:30 ET are the same New York day, but the second is after UTC midnight.
    const series = mapChart(
      'IBM',
      '1d',
      [bar('2026-11-19T21:00:00Z', 1), bar('2026-11-20T01:30:00Z', 2)],
      NY,
    );
    expect(series.points).toHaveLength(2);
  });

  it('returns all bars for multi-day windows', () => {
    const bars = [bar('2026-11-18T15:00:00Z', 1), bar('2026-11-19T15:00:00Z', 2)];
    expect(mapChart('IBM', '7d', bars, NY).points).toHaveLength(2);
  });

  it('converts missing and non-finite closes to null but keeps timestamps', () => {
    const series = mapChart('IBM', '7d', [bar('2026-11-18T15:00:00Z', null), bar('2026-11-19T15:00:00Z', NaN), bar('2026-11-19T16:00:00Z', 5)], NY);
    expect(series.points.map((p) => p.close)).toEqual([null, null, 5]);
  });

  it('handles an empty chart', () => {
    expect(mapChart('IBM', '1d', [], NY).points).toEqual([]);
  });
});

describe('hasData', () => {
  it('is true only when at least one close is usable', () => {
    expect(hasData({ symbol: 'A', window: '7d', points: [{ time: 't', close: null }] })).toBe(false);
    expect(hasData({ symbol: 'A', window: '7d', points: [{ time: 't', close: null }, { time: 'u', close: 1 }] })).toBe(true);
  });
});
