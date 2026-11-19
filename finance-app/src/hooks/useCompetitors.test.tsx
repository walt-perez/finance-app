import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MarketDataProvider } from '../../shared/MarketDataProvider';
import { MarketDataError } from '../../shared/validation';
import { MockProvider } from '../services/mockProvider';
import { useCompetitors } from './useCompetitors';

// Providers are created once, outside renderHook callbacks.
const mock = new MockProvider();
const initial = ['MSFT', 'ORCL'];

describe('useCompetitors', () => {
  it('starts with the initial list', () => {
    const { result } = renderHook(() => useCompetitors(mock, 'IBM', initial));
    expect(result.current.competitors).toEqual(['MSFT', 'ORCL']);
  });

  it('adds a symbol the provider can quote, normalized to upper case', async () => {
    const { result } = renderHook(() => useCompetitors(mock, 'IBM', initial));
    let outcome: string | null = 'unset';
    await act(async () => {
      outcome = await result.current.add(' nvda ');
    });
    expect(outcome).toBeNull();
    expect(result.current.competitors).toEqual(['MSFT', 'ORCL', 'NVDA']);
  });

  it('removes a symbol', async () => {
    const { result } = renderHook(() => useCompetitors(mock, 'IBM', initial));
    act(() => result.current.remove('MSFT'));
    expect(result.current.competitors).toEqual(['ORCL']);
  });

  it('rejects malformed symbols without calling the provider', async () => {
    const getQuotes = vi.spyOn(mock, 'getQuotes');
    getQuotes.mockClear();
    const { result } = renderHook(() => useCompetitors(mock, 'IBM', initial));
    let outcome: string | null = null;
    await act(async () => {
      outcome = await result.current.add('<script>');
    });
    expect(outcome).toContain('is not a valid ticker symbol');
    expect(getQuotes).not.toHaveBeenCalled();
    expect(result.current.competitors).toEqual(initial);
  });

  it.each(['IBM', 'msft'])('rejects %s as already on the dashboard', async (symbol) => {
    const { result } = renderHook(() => useCompetitors(mock, 'IBM', initial));
    let outcome: string | null = null;
    await act(async () => {
      outcome = await result.current.add(symbol);
    });
    expect(outcome).toContain('already on the dashboard');
    expect(result.current.competitors).toEqual(initial);
  });

  it('rejects an addition beyond the company limit', async () => {
    const full = ['MSFT', 'ORCL', 'SAP', 'CRM'];
    const { result } = renderHook(() => useCompetitors(mock, 'IBM', full));
    let outcome: string | null = null;
    await act(async () => {
      outcome = await result.current.add('NVDA');
    });
    expect(outcome).toContain('at most 5 companies');
    expect(result.current.competitors).toEqual(full);
  });

  it('allows the fifth company but not the sixth', async () => {
    const { result } = renderHook(() => useCompetitors(mock, 'IBM', ['MSFT', 'ORCL', 'SAP']));
    await act(async () => {
      expect(await result.current.add('CRM')).toBeNull();
    });
    expect(result.current.competitors).toHaveLength(4);
    await act(async () => {
      expect(await result.current.add('NVDA')).not.toBeNull();
    });
    expect(result.current.competitors).toHaveLength(4);
  });

  it('does not add a symbol Yahoo has no quote for', async () => {
    const silent: MarketDataProvider = { getQuotes: async () => [], getHistory: (s, w) => mock.getHistory(s, w) };
    const { result } = renderHook(() => useCompetitors(silent, 'IBM', initial));
    let outcome: string | null = null;
    await act(async () => {
      outcome = await result.current.add('ZZZZ');
    });
    expect(outcome).toBe('No market data found for ZZZZ.');
    expect(result.current.competitors).toEqual(initial);
  });

  it('does not add a symbol when the lookup fails, and reports the error', async () => {
    const down: MarketDataProvider = {
      getQuotes: () => Promise.reject(new MarketDataError('NETWORK_ERROR', 'Could not reach the market data service.')),
      getHistory: (s, w) => mock.getHistory(s, w),
    };
    const { result } = renderHook(() => useCompetitors(down, 'IBM', initial));
    let outcome: string | null = null;
    await act(async () => {
      outcome = await result.current.add('NVDA');
    });
    expect(outcome).toBe('Could not reach the market data service.');
    expect(result.current.competitors).toEqual(initial);
  });

  it('uses a generic message for non-Error rejections', async () => {
    const odd: MarketDataProvider = { getQuotes: () => Promise.reject('x'), getHistory: (s, w) => mock.getHistory(s, w) };
    const { result } = renderHook(() => useCompetitors(odd, 'IBM', initial));
    let outcome: string | null = null;
    await act(async () => {
      outcome = await result.current.add('NVDA');
    });
    expect(outcome).toBe('Could not look up NVDA.');
  });
});
