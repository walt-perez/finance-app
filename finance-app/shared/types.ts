/** Types shared by the proxy server and the React client. */

/** IBM plus up to four competitors. Enforced by the client config and the API. */
export const MAX_COMPANIES = 5;

export type TimeWindow = '1d' | '7d' | '3m';

export const TIME_WINDOWS: readonly TimeWindow[] = ['1d', '7d', '3m'];

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

export interface PricePoint {
  /** ISO 8601 timestamp */
  time: string;
  close: number | null;
}

export interface Series {
  symbol: string;
  window: TimeWindow;
  points: PricePoint[];
}

export type ApiErrorCode =
  | 'INVALID_SYMBOL'
  | 'INVALID_WINDOW'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'NETWORK_ERROR';

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
}
