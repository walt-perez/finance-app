import { describe, expect, it } from 'vitest';
import { MAX_COMPANIES } from '../../shared/types';
import { normalizeSymbol } from '../../shared/validation';
import { COMPANIES, DEFAULT_COMPETITORS, EXTRA_COLORS, PRIMARY_SYMBOL, SYMBOLS, assignColors } from './companies';

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

  it('treats IBM as the primary company and the rest as the default competitors', () => {
    expect(PRIMARY_SYMBOL).toBe('IBM');
    expect(DEFAULT_COMPETITORS).toEqual(['MSFT', 'ORCL', 'SAP', 'CRM']);
  });
});

describe('assignColors', () => {
  it('keeps the configured color for configured companies', () => {
    const colors = assignColors(['IBM', 'SAP']);
    expect(colors.IBM).toBe(COMPANIES[0].color);
    expect(colors.SAP).toBe(COMPANIES.find((c) => c.symbol === 'SAP')?.color);
  });

  it('gives each added company a different color, none of them a configured color', () => {
    const colors = assignColors(['IBM', 'AAA', 'BBB', 'CCC', 'DDD']);
    const extras = [colors.AAA, colors.BBB, colors.CCC, colors.DDD];
    expect(new Set(extras).size).toBe(4);
    for (const c of extras) {
      expect(EXTRA_COLORS).toContain(c);
      expect(COMPANIES.map((x) => x.color)).not.toContain(c);
    }
  });

  it('has extra colors that are valid, unique hex values distinct from the configured ones', () => {
    const all = [...EXTRA_COLORS, ...COMPANIES.map((c) => c.color)];
    for (const c of EXTRA_COLORS) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    expect(new Set(all).size).toBe(all.length);
  });

  it('does not depend on how many other companies were removed', () => {
    expect(assignColors(['IBM', 'AAA']).AAA).toBe(EXTRA_COLORS[0]);
  });
});
