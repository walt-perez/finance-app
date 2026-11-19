import { useEffect, useState } from 'react';
import type { MarketDataProvider } from '../../shared/MarketDataProvider';
import type { Quote } from '../../shared/types';

export interface QuotesState {
  quotes: Quote[];
  error: string | null;
  loading: boolean;
}

export function useQuotes(provider: MarketDataProvider, symbols: string[]): QuotesState {
  const [state, setState] = useState<QuotesState>({ quotes: [], error: null, loading: true });
  const key = symbols.join(',');

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    provider
      .getQuotes(key.split(',').filter(Boolean))
      .then((quotes) => !cancelled && setState({ quotes, error: null, loading: false }))
      .catch(
        (err: unknown) =>
          !cancelled &&
          setState({ quotes: [], error: err instanceof Error ? err.message : 'Unknown error', loading: false }),
      );
    return () => {
      cancelled = true;
    };
  }, [provider, key]);

  return state;
}
