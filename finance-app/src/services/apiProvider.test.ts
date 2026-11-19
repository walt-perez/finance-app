import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiProvider } from './apiProvider';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function stubFetch(impl: (url: string) => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('ApiProvider', () => {
  const provider = new ApiProvider();

  it('requests quotes with a comma-joined, encoded symbol list', async () => {
    const fetchMock = stubFetch(async () => json([{ symbol: 'IBM' }]));
    const quotes = await provider.getQuotes(['IBM', 'BRK-B']);
    expect(fetchMock).toHaveBeenCalledWith('/api/quotes?symbols=IBM%2CBRK-B');
    expect(quotes).toEqual([{ symbol: 'IBM' }]);
  });

  it('requests history with symbol and window', async () => {
    const fetchMock = stubFetch(async () => json({ symbol: 'IBM', window: '7d', points: [] }));
    await provider.getHistory('IBM', '7d');
    expect(fetchMock).toHaveBeenCalledWith('/api/history?symbol=IBM&window=7d');
  });

  it('turns an API error body into a typed MarketDataError', async () => {
    stubFetch(async () => json({ code: 'NOT_FOUND', message: 'No market data found for ZZZ.' }, 404));
    await expect(provider.getHistory('ZZZ', '1d')).rejects.toMatchObject({
      name: 'MarketDataError',
      code: 'NOT_FOUND',
      message: 'No market data found for ZZZ.',
    });
  });

  it('explains a failure with no JSON body (e.g. the dev proxy cannot reach the API)', async () => {
    stubFetch(async () => new Response('', { status: 500 }));
    await expect(provider.getQuotes(['IBM'])).rejects.toMatchObject({
      code: 'UPSTREAM_ERROR',
      message: expect.stringMatching(/unavailable \(HTTP 500\).*npm run dev:server/),
    });
  });

  it('keeps the API message when the error body has no code', async () => {
    stubFetch(async () => json({ message: 'custom' }, 500));
    await expect(provider.getQuotes(['IBM'])).rejects.toMatchObject({ code: 'UPSTREAM_ERROR', message: 'custom' });
  });

  it('maps a network failure to NETWORK_ERROR', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(provider.getQuotes(['IBM'])).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
