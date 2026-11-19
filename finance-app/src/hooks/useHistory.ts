import { useEffect, useState } from 'react';
import type { MarketDataProvider } from '../../shared/MarketDataProvider';
import type { Series, TimeWindow } from '../../shared/types';

export interface SymbolError {
  symbol: string;
  message: string;
}

export interface HistoryState {
  series: Series[];
  errors: SymbolError[];
  loading: boolean;
}

/**
 * Loads history for each symbol independently, so one failing ticker
 * produces a per-symbol error instead of blanking the whole dashboard.
 */
export function useHistory(provider: MarketDataProvider, window: TimeWindow, symbols: string[]): HistoryState {
  const [state, setState] = useState<HistoryState>({ series: [], errors: [], loading: true });
  const key = symbols.join(',');

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    Promise.allSettled(key.split(',').filter(Boolean).map((sym) => provider.getHistory(sym, window))).then(
      (results) => {
        if (cancelled) return;
        const list = key.split(',').filter(Boolean);
        const series: Series[] = [];
        const errors: SymbolError[] = [];
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') series.push(r.value);
          else errors.push({ symbol: list[i], message: r.reason instanceof Error ? r.reason.message : 'Unknown error' });
        });
        setState({ series, errors, loading: false });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [provider, window, key]);

  return state;
}
