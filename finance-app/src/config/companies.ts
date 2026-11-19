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
