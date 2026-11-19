import { describe, expect, it } from 'vitest';
import { MAX_COMPANIES } from '../../shared/types';
import { normalizeSymbol } from '../../shared/validation';
import { COMPANIES, SYMBOLS } from './companies';

describe('company config', () => {
  it('puts IBM first', () => {
    expect(COMPANIES[0].symbol).toBe('IBM');
  });

  it('is IBM plus at most four competitors', () => {
    expect(COMPANIES.length).toBeGreaterThanOrEqual(1);
    expect(COMPANIES.length).toBeLessThanOrEqual(MAX_COMPANIES);
  });

  it('uses unique, API-valid symbols', () => {
    expect(new Set(SYMBOLS).size).toBe(SYMBOLS.length);
    for (const symbol of SYMBOLS) expect(normalizeSymbol(symbol)).toBe(symbol);
  });

  it('gives every company a unique hex color so chart lines are distinguishable', () => {
    const colors = COMPANIES.map((c) => c.color);
    for (const color of colors) expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('exposes SYMBOLS in the same order as COMPANIES', () => {
    expect(SYMBOLS).toEqual(COMPANIES.map((c) => c.symbol));
  });
});
