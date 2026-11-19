// @vitest-environment node
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { MarketDataProvider } from '../shared/MarketDataProvider';
import { MarketDataError } from '../shared/validation';
import { createApp } from './index';

const provider: MarketDataProvider = {
  getQuotes: async (symbols) =>
    symbols.map((symbol) => ({ symbol, name: symbol, price: 1, change: 0, changePercent: 0, currency: 'USD' })),
  getHistory: async (symbol, window) => {
    if (symbol === 'ZZZZ') throw new MarketDataError('NOT_FOUND', 'No history found for ZZZZ.');
    return { symbol, window, points: [{ time: '2026-01-01T00:00:00.000Z', close: 1 }] };
  },
};

let server: Server;
let base: string;

beforeAll(async () => {
  server = createApp(provider).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

describe('API routes', () => {
  it('returns quotes for valid symbols', async () => {
    const res = await fetch(`${base}/api/quotes?symbols=ibm,msft`);
    expect(res.status).toBe(200);
    expect((await res.json()).map((q: { symbol: string }) => q.symbol)).toEqual(['IBM', 'MSFT']);
  });

  it('rejects more than five symbols', async () => {
    const res = await fetch(`${base}/api/quotes?symbols=A,B,C,D,E,F`);
    expect(res.status).toBe(400);
  });

  it('returns history for a valid symbol and window', async () => {
    const res = await fetch(`${base}/api/history?symbol=ibm&window=7d`);
    expect(res.status).toBe(200);
    expect((await res.json()).symbol).toBe('IBM');
  });

  it('returns 400 for an invalid window', async () => {
    const res = await fetch(`${base}/api/history?symbol=IBM&window=1y`);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('INVALID_WINDOW');
  });

  it('accepts exactly the maximum number of symbols', async () => {
    const res = await fetch(`${base}/api/quotes?symbols=A,B,C,D,E`);
    expect(res.status).toBe(200);
  });

  it('rejects an empty or missing symbols list', async () => {
    expect((await fetch(`${base}/api/quotes`)).status).toBe(400);
    expect((await fetch(`${base}/api/quotes?symbols=`)).status).toBe(400);
  });

  it('rejects a malformed symbol inside a list', async () => {
    const res = await fetch(`${base}/api/quotes?symbols=IBM,%3Cscript%3E`);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('INVALID_SYMBOL');
  });

  it('rejects a missing history symbol', async () => {
    const res = await fetch(`${base}/api/history?window=1d`);
    expect(res.status).toBe(400);
  });

  it('hides internal error details when a provider throws something unexpected', async () => {
    const broken = createApp({
      getQuotes: async () => {
        throw new Error('secret stack detail');
      },
      getHistory: async () => {
        throw new Error('secret stack detail');
      },
    }).listen(0);
    await new Promise((r) => broken.once('listening', r));
    try {
      const url = `http://127.0.0.1:${(broken.address() as AddressInfo).port}/api/quotes?symbols=IBM`;
      const res = await fetch(url);
      const text = await res.text();
      expect(res.status).toBe(502);
      expect(JSON.parse(text).code).toBe('UPSTREAM_ERROR');
      expect(text).not.toContain('secret');
    } finally {
      broken.close();
    }
  });

  it('maps rate limiting to 429', async () => {
    const limited = createApp({
      getQuotes: async () => {
        throw new MarketDataError('RATE_LIMITED', 'slow down');
      },
      getHistory: async () => {
        throw new MarketDataError('RATE_LIMITED', 'slow down');
      },
    }).listen(0);
    await new Promise((r) => limited.once('listening', r));
    try {
      const res = await fetch(`http://127.0.0.1:${(limited.address() as AddressInfo).port}/api/history?symbol=IBM&window=1d`);
      expect(res.status).toBe(429);
    } finally {
      limited.close();
    }
  });

  it('maps provider NOT_FOUND to 404', async () => {
    const res = await fetch(`${base}/api/history?symbol=ZZZZ&window=1d`);
    expect(res.status).toBe(404);
  });
});
