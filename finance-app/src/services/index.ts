import type { MarketDataProvider } from '../../shared/MarketDataProvider';
import { ApiProvider } from './apiProvider';
import { MockProvider } from './mockProvider';

/**
 * The app's one data entry point. Defaults to the offline mock;
 * run `npm run dev:live` (with `npm run dev:server`) for live Yahoo Finance data.
 */
export const marketData: MarketDataProvider =
  import.meta.env.VITE_DATA_SOURCE === 'api' ? new ApiProvider() : new MockProvider();
