import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MarketDataProvider } from '../../shared/MarketDataProvider';
import { MarketDataError } from '../../shared/validation';
import { MockProvider } from '../services/mockProvider';
import { useHistory } from './useHistory';
import { useQuotes } from './useQuotes';

describe('useQuotes', () => {
  it('starts loading, then returns quotes', async () => {
    const provider = new MockProvider();
    const { result } = renderHook(() => useQuotes(provider, ['IBM', 'MSFT']));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.quotes.map((q) => q.symbol)).toEqual(['IBM', 'MSFT']);
    expect(result.current.error).toBeNull();
  });

  it('exposes the error message and no quotes when the provider fails', async () => {
    const provider: MarketDataProvider = {
      getQuotes: () => Promise.reject(new MarketDataError('RATE_LIMITED', 'slow down')),
      getHistory: () => Promise.reject(new Error('unused')),
    };
    const { result } = renderHook(() => useQuotes(provider, ['IBM']));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('slow down');
    expect(result.current.quotes).toEqual([]);
  });

  it('reports a generic message for non-Error rejections', async () => {
    const provider: MarketDataProvider = {
      getQuotes: () => Promise.reject('weird'),
      getHistory: () => Promise.reject(new Error('unused')),
    };
    const { result } = renderHook(() => useQuotes(provider, ['IBM']));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Unknown error');
  });

  it('ignores a response that arrives after unmount', async () => {
    let resolve!: (v: never[]) => void;
    const provider: MarketDataProvider = {
      getQuotes: () => new Promise((r) => (resolve = r)),
      getHistory: () => Promise.reject(new Error('unused')),
    };
    const { result, unmount } = renderHook(() => useQuotes(provider, ['IBM']));
    unmount();
    resolve([]);
    await Promise.resolve();
    expect(result.current.loading).toBe(true);
  });
});

describe('useHistory', () => {
  it('loads one series per symbol', async () => {
    const provider = new MockProvider();
    const { result } = renderHook(() => useHistory(provider, '7d', ['IBM', 'SAP']));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.series.map((s) => s.symbol)).toEqual(['IBM', 'SAP']);
    expect(result.current.errors).toEqual([]);
  });

  it('isolates failures: good symbols load, bad ones are reported by name', async () => {
    const mock = new MockProvider();
    const provider: MarketDataProvider = {
      getQuotes: (s) => mock.getQuotes(s),
      getHistory: (symbol, window) =>
        symbol === 'SAP' ? Promise.reject(new MarketDataError('NOT_FOUND', 'gone')) : mock.getHistory(symbol, window),
    };
    const { result } = renderHook(() => useHistory(provider, '1d', ['IBM', 'SAP', 'CRM']));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.series.map((s) => s.symbol)).toEqual(['IBM', 'CRM']);
    expect(result.current.errors).toEqual([{ symbol: 'SAP', message: 'gone' }]);
  });

  it('reports a generic message for non-Error rejections', async () => {
    const provider: MarketDataProvider = {
      getQuotes: () => Promise.reject(new Error('unused')),
      getHistory: () => Promise.reject('weird'),
    };
    const { result } = renderHook(() => useHistory(provider, '1d', ['IBM']));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.errors).toEqual([{ symbol: 'IBM', message: 'Unknown error' }]);
  });

  it('refetches when the window changes and shows loading in between', async () => {
    const mock = new MockProvider();
    const spy = vi.spyOn(mock, 'getHistory');
    const { result, rerender } = renderHook(({ w }) => useHistory(mock, w, ['IBM']), {
      initialProps: { w: '1d' as '1d' | '3m' },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ w: '3m' });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(spy).toHaveBeenLastCalledWith('IBM', '3m');
    expect(result.current.series[0].window).toBe('3m');
  });

  it('does not refetch when re-rendered with an equal symbol list', async () => {
    const mock = new MockProvider();
    const spy = vi.spyOn(mock, 'getHistory');
    const { result, rerender } = renderHook(() => useHistory(mock, '1d', ['IBM', 'SAP']));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const calls = spy.mock.calls.length;
    rerender();
    expect(spy.mock.calls.length).toBe(calls);
  });
});
