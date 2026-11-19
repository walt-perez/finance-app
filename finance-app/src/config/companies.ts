import { MAX_COMPANIES } from '../../shared/types';

export interface Company {
  symbol: string;
  name: string;
  /** Hex color used consistently for this company across all charts. */
  color: string;
}

/** IBM first, then up to four competitors. Add a company here to add it everywhere. */
export const COMPANIES: readonly Company[] = [
  { symbol: 'IBM', name: 'IBM', color: '#0f62fe' },
  { symbol: 'MSFT', name: 'Microsoft', color: '#da1e28' },
  { symbol: 'ORCL', name: 'Oracle', color: '#f1c21b' },
  { symbol: 'SAP', name: 'SAP', color: '#24a148' },
  { symbol: 'CRM', name: 'Salesforce', color: '#8a3ffc' },
];

if (COMPANIES.length > MAX_COMPANIES) {
  throw new Error(`Configure at most ${MAX_COMPANIES} companies (IBM + 4 competitors).`);
}

export const SYMBOLS = COMPANIES.map((c) => c.symbol);

/** IBM is the subject of the dashboard and cannot be removed. */
export const PRIMARY_SYMBOL = COMPANIES[0].symbol;

/** The competitors shown before the user changes anything. */
export const DEFAULT_COMPETITORS: readonly string[] = SYMBOLS.slice(1);

/** Colors for companies the user adds. Distinct from every configured company color. */
export const EXTRA_COLORS: readonly string[] = ['#009d9a', '#ff832b', '#9f1853', '#525252', '#33b1ff'];

/** Configured companies keep their own color; others take EXTRA_COLORS in list order. */
export function assignColors(symbols: readonly string[]): Record<string, string> {
  const colors: Record<string, string> = {};
  let extra = 0;
  for (const symbol of symbols) {
    const company = COMPANIES.find((c) => c.symbol === symbol);
    colors[symbol] = company ? company.color : EXTRA_COLORS[extra++ % EXTRA_COLORS.length];
  }
  return colors;
}
