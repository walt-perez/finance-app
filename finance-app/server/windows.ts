import type { TimeWindow } from '../shared/types';

export interface WindowQuery {
  /** How far back to request, in days. */
  lookbackDays: number;
  interval: '5m' | '1h' | '1d';
}

/**
 * Single place that maps a UI time window to a Yahoo chart query.
 * 1d requests 5 days so weekends/holidays still contain a last session.
 */
export const WINDOW_QUERIES: Record<TimeWindow, WindowQuery> = {
  '1d': { lookbackDays: 5, interval: '5m' },
  '7d': { lookbackDays: 7, interval: '1h' },
  '3m': { lookbackDays: 90, interval: '1d' },
};
