import { describe, expect, it } from 'vitest';
import { MarketDataError } from '../../shared/validation';
import { SYMBOLS } from '../config/companies';
import { MockProvider } from './mockProvider';

describe('MockProvider', () => {
  const provider = new MockProvider();

  it('returns one well-formed quote per requested symbol, in order', async () => {
    const quotes = await provider.getQuotes(SYMBOLS);
    expect(quotes.map((q) => q.symbol)).toEqual(SYMBOLS);
    for (const q of quotes) {
      expect(q.price).toBeGreaterThan(0);
      expect(Number.isFinite(q.change)).toBe(true);
      expect(Number.isFinite(q.changePercent)).toBe(true);
      expect(q.currency).toBe('USD');
    }
  });

  it('normalizes symbol case and rejects invalid symbols', async () => {
    expect((await provider.getQuotes(['ibm']))[0].symbol).toBe('IBM');
    await expect(provider.getQuotes(['<bad>'])).rejects.toBeInstanceOf(MarketDataError);
    await expect(provider.getHistory('', '1d')).rejects.toMatchObject({ code: 'INVALID_SYMBOL' });
  });

  it.each([
    ['1d', 78],
    ['7d', 56],
    ['3m', 90],
  ] as const)('returns the expected number of points for %s', async (window, count) => {
    const series = await provider.getHistory('IBM', window);
    expect(series.window).toBe(window);
    expect(series.points).toHaveLength(count);
  });

  it('returns chronological, positive, non-null closes', async () => {
    const { points } = await provider.getHistory('MSFT', '7d');
    const times = points.map((p) => Date.parse(p.time));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    for (const p of points) expect(p.close).toBeGreaterThan(0);
  });

  it('is deterministic in shape per symbol and window, and differs across symbols', async () => {
    const a = (await provider.getHistory('IBM', '3m')).points.map((p) => p.close);
    const b = (await provider.getHistory('IBM', '3m')).points.map((p) => p.close);
    const c = (await provider.getHistory('SAP', '3m')).points.map((p) => p.close);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('still serves symbols outside the configured companies', async () => {
    const [quote] = await provider.getQuotes(['ZZZ']);
    expect(quote).toMatchObject({ symbol: 'ZZZ', name: 'ZZZ' });
  });
});
