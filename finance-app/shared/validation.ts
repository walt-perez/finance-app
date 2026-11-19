import { TIME_WINDOWS, type ApiErrorCode, type TimeWindow } from './types';

const SYMBOL_PATTERN = /^[A-Z][A-Z0-9.-]{0,9}$/;

export class MarketDataError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'MarketDataError';
  }
}

export function normalizeSymbol(input: string): string {
  const symbol = input.trim().toUpperCase();
  if (!SYMBOL_PATTERN.test(symbol)) {
    throw new MarketDataError('INVALID_SYMBOL', `"${input}" is not a valid ticker symbol.`);
  }
  return symbol;
}

export function parseWindow(input: unknown): TimeWindow {
  if (typeof input === 'string' && (TIME_WINDOWS as readonly string[]).includes(input)) {
    return input as TimeWindow;
  }
  throw new MarketDataError('INVALID_WINDOW', `Window must be one of: ${TIME_WINDOWS.join(', ')}.`);
}
