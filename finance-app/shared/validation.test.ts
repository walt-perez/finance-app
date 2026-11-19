import { describe, expect, it } from 'vitest';
import { MarketDataError, normalizeSymbol, parseWindow } from './validation';

describe('normalizeSymbol', () => {
  it('trims and uppercases', () => {
    expect(normalizeSymbol('  ibm ')).toBe('IBM');
  });

  it('accepts class-share style symbols', () => {
    expect(normalizeSymbol('brk-b')).toBe('BRK-B');
  });

  it.each(['', '123', 'TOO-LONG-SYMBOL', 'A B', '<script>'])('rejects %j', (input) => {
    expect(() => normalizeSymbol(input)).toThrow(MarketDataError);
  });
});

describe('parseWindow', () => {
  it('accepts supported windows', () => {
    expect(parseWindow('3m')).toBe('3m');
  });

  it('rejects unsupported windows', () => {
    expect(() => parseWindow('1y')).toThrow(MarketDataError);
    expect(() => parseWindow(undefined)).toThrow(MarketDataError);
  });
});
