import { useCallback, useState } from 'react';
import type { TimeWindow } from '../../shared/types';
import { parseWindow } from '../../shared/validation';

const PARAM = 'window';
const DEFAULT_WINDOW: TimeWindow = '1d';

/** Read the time window from a query string; anything missing or unknown falls back to the default. */
export function readWindow(search: string): TimeWindow {
  try {
    return parseWindow(new URLSearchParams(search).get(PARAM));
  } catch {
    return DEFAULT_WINDOW;
  }
}

/** Return the query string with `window` set, leaving every other parameter in place. */
export function withWindow(search: string, value: TimeWindow): string {
  const params = new URLSearchParams(search);
  params.set(PARAM, value);
  return `?${params.toString()}`;
}

/**
 * Time-window state backed by the `?window=` URL parameter, so a view can be bookmarked and shared.
 * Updates use replaceState: switching tabs does not reload the page or add browser history entries.
 */
export function useUrlWindow(): [TimeWindow, (value: TimeWindow) => void] {
  const [value, setValue] = useState<TimeWindow>(() => readWindow(window.location.search));

  const update = useCallback((next: TimeWindow) => {
    const { pathname, search, hash } = window.location;
    window.history.replaceState(window.history.state, '', `${pathname}${withWindow(search, next)}${hash}`);
    setValue(next);
  }, []);

  return [value, update];
}
