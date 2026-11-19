import { useCallback, useState } from 'react';
import type { MarketDataProvider } from '../../shared/MarketDataProvider';
import { MAX_COMPANIES } from '../../shared/types';
import { MarketDataError, normalizeSymbol } from '../../shared/validation';

export interface Competitors {
  competitors: string[];
  /** Resolves to null when the symbol was added, or a message explaining why it was not. */
  add: (symbol: string) => Promise<string | null>;
  remove: (symbol: string) => void;
}

/**
 * The user's list of competitors. A symbol is only added once the provider returns a quote for it,
 * so unknown tickers never reach the charts. IBM (`primary`) is not part of this list.
 */
export function useCompetitors(
  provider: MarketDataProvider,
  primary: string,
  initial: readonly string[],
): Competitors {
  const [competitors, setCompetitors] = useState<string[]>([...initial]);

  const add = useCallback(
    async (raw: string): Promise<string | null> => {
      let symbol: string;
      try {
        symbol = normalizeSymbol(raw);
      } catch (err) {
        return err instanceof MarketDataError ? err.message : 'Enter a valid ticker symbol.';
      }
      if (symbol === primary || competitors.includes(symbol)) return `${symbol} is already on the dashboard.`;
      if (competitors.length + 1 >= MAX_COMPANIES) {
        return `The dashboard compares at most ${MAX_COMPANIES} companies. Remove one first.`;
      }
      try {
        const quotes = await provider.getQuotes([symbol]);
        if (!quotes.some((q) => q.symbol === symbol)) return `No market data found for ${symbol}.`;
      } catch (err) {
        return err instanceof Error ? err.message : `Could not look up ${symbol}.`;
      }
      setCompetitors((current) => [...current, symbol]);
      return null;
    },
    [provider, primary, competitors],
  );

  const remove = useCallback((symbol: string) => {
    setCompetitors((current) => current.filter((s) => s !== symbol));
  }, []);

  return { competitors, add, remove };
}
