import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { readWindow, useUrlWindow, withWindow } from './useUrlWindow';

describe('readWindow', () => {
  it.each(['1d', '7d', '3m'] as const)('reads %s', (w) => {
    expect(readWindow(`?window=${w}`)).toBe(w);
  });

  it.each(['', '?', '?window=', '?window=1y', '?window=7D', '?other=7d'])('falls back to 1d for %j', (search) => {
    expect(readWindow(search)).toBe('1d');
  });

  it('finds window among other params', () => {
    expect(readWindow('?a=1&window=3m&b=2')).toBe('3m');
  });
});

describe('withWindow', () => {
  it('adds the param to an empty query', () => {
    expect(withWindow('', '7d')).toBe('?window=7d');
  });

  it('replaces an existing value and keeps other params', () => {
    expect(withWindow('?a=1&window=7d&b=2', '3m')).toBe('?a=1&window=3m&b=2');
  });
});

describe('useUrlWindow', () => {
  it('reads the initial window from the URL', () => {
    window.history.replaceState(null, '', '/?window=7d');
    const { result } = renderHook(() => useUrlWindow());
    expect(result.current[0]).toBe('7d');
  });

  it('defaults to 1d when the URL has no window', () => {
    const { result } = renderHook(() => useUrlWindow());
    expect(result.current[0]).toBe('1d');
  });

  it('updates state and URL without adding history entries, keeping other params and hash', () => {
    window.history.replaceState({ k: 1 }, '', '/path?a=1#frag');
    const before = window.history.length;
    const { result } = renderHook(() => useUrlWindow());

    act(() => result.current[1]('3m'));

    expect(result.current[0]).toBe('3m');
    expect(window.location.pathname).toBe('/path');
    expect(window.location.search).toBe('?a=1&window=3m');
    expect(window.location.hash).toBe('#frag');
    expect(window.history.state).toEqual({ k: 1 });
    expect(window.history.length).toBe(before);
  });
});
