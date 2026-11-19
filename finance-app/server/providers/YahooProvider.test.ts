// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { quote, chart } = vi.hoisted(() => ({ quote: vi.fn(), chart: vi.fn() }));

vi.mock('yahoo-finance2', () => ({
  default: class {
    quote = quote;
    chart = chart;
  },
}));

import { YahooProvider } from './YahooProvider';

const rawQuote = (symbol: string, extra: Record<string, unknown> = {}) => ({
  symbol,
  shortName: symbol,
  currency: 'USD',
  regularMarketPrice: 100,
  regularMarketChange: 1,
  regularMarketChangePercent: 1,
  ...extra,
});

const bar = (iso: string, close: number | null) => ({ date: new Date(iso), close });

beforeEach(() => {
  quote.mockReset();
  chart.mockReset();
});

describe('YahooProvider.getQuotes', () => {
  it('makes one batched call, drops incomplete quotes and follows the requested order', async () => {
    quote.mockResolvedValue([
      rawQuote('MSFT'),
      rawQuote('ORCL', { regularMarketPrice: undefined }),
      rawQuote('IBM'),
    ]);
    const quotes = await new YahooProvider().getQuotes(['IBM', 'MSFT', 'ORCL']);
    expect(quote).toHaveBeenCalledTimes(1);
    expect(quote).toHaveBeenCalledWith(['IBM', 'MSFT', 'ORCL']);
    expect(quotes.map((q) => q.symbol)).toEqual(['IBM', 'MSFT']);
  });

  it('ignores entries that have no symbol', async () => {
    quote.mockResolvedValue([{ bid: 1 }, rawQuote('IBM')]);
    const quotes = await new YahooProvider().getQuotes(['IBM']);
    expect(quotes.map((q) => q.symbol)).toEqual(['IBM']);
  });

  it('throws NOT_FOUND when nothing can be quoted', async () => {
    quote.mockResolvedValue([]);
    await expect(new YahooProvider().getQuotes(['ZZZ'])).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it.each([
    ['HTTP 429 Too Many Requests', 'RATE_LIMITED'],
    ['Quote not found for symbol: ZZZ', 'NOT_FOUND'],
    ['socket hang up', 'UPSTREAM_ERROR'],
  ])('maps the upstream error "%s" to %s', async (message, code) => {
    quote.mockRejectedValue(new Error(message));
    await expect(new YahooProvider().getQuotes(['IBM'])).rejects.toMatchObject({ code });
  });

  it('does not leak non-Error rejections', async () => {
    quote.mockRejectedValue('boom');
    await expect(new YahooProvider().getQuotes(['IBM'])).rejects.toMatchObject({ code: 'UPSTREAM_ERROR' });
  });
});

describe('YahooProvider.getHistory', () => {
  const meta = { exchangeTimezoneName: 'America/New_York' };

  it.each([
    ['1d', '5m', 5],
    ['7d', '1h', 7],
    ['3m', '1d', 90],
  ] as const)('queries %s with interval %s over %d days, regular hours only', async (window, interval, days) => {
    chart.mockResolvedValue({ meta, quotes: [bar('2026-11-19T15:00:00Z', 1)] });
    await new YahooProvider().getHistory('IBM', window);

    const [symbol, options] = chart.mock.calls[0];
    expect(symbol).toBe('IBM');
    expect(options).toMatchObject({ interval, includePrePost: false });
    const lookbackMs = Date.now() - (options.period1 as Date).getTime();
    expect(Math.abs(lookbackMs - days * 86_400_000)).toBeLessThan(5_000);
  });

  it('returns a normalized series (latest session only for 1d)', async () => {
    chart.mockResolvedValue({
      meta,
      quotes: [bar('2026-11-18T15:00:00Z', 1), bar('2026-11-19T15:00:00Z', 2), bar('2026-11-19T16:00:00Z', null)],
    });
    const series = await new YahooProvider().getHistory('IBM', '1d');
    expect(series).toMatchObject({ symbol: 'IBM', window: '1d' });
    expect(series.points.map((p) => p.close)).toEqual([2, null]);
  });

  it('falls back to New York time when Yahoo omits the exchange timezone', async () => {
    chart.mockResolvedValue({ meta: {}, quotes: [bar('2026-11-19T15:00:00Z', 1)] });
    await expect(new YahooProvider().getHistory('IBM', '1d')).resolves.toBeDefined();
  });

  it('throws NOT_FOUND when there are no usable closes', async () => {
    chart.mockResolvedValue({ meta, quotes: [bar('2026-11-19T15:00:00Z', null)] });
    await expect(new YahooProvider().getHistory('IBM', '7d')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'No history found for IBM.',
    });
  });

  it('names the symbol when Yahoo cannot find it', async () => {
    chart.mockRejectedValue(new Error('No data found, symbol may be delisted'));
    await expect(new YahooProvider().getHistory('ZZZ', '7d')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'No market data found for ZZZ.',
    });
  });
});
