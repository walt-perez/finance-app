import express from 'express';
import type { MarketDataProvider } from '../shared/MarketDataProvider';
import { MAX_COMPANIES, type ApiErrorCode } from '../shared/types';
import { MarketDataError, normalizeSymbol, parseWindow } from '../shared/validation';
import { YahooProvider } from './providers/YahooProvider';

const STATUS: Record<ApiErrorCode, number> = {
  INVALID_SYMBOL: 400,
  INVALID_WINDOW: 400,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
  NETWORK_ERROR: 502,
};

export function createApp(provider: MarketDataProvider) {
  const app = express();

  app.get('/api/quotes', async (req, res) => {
    try {
      const raw = String(req.query.symbols ?? '').split(',').filter(Boolean);
      if (raw.length === 0 || raw.length > MAX_COMPANIES) {
        throw new MarketDataError('INVALID_SYMBOL', `Provide 1-${MAX_COMPANIES} comma-separated symbols.`);
      }
      res.json(await provider.getQuotes(raw.map(normalizeSymbol)));
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get('/api/history', async (req, res) => {
    try {
      const symbol = normalizeSymbol(String(req.query.symbol ?? ''));
      const window = parseWindow(req.query.window);
      res.json(await provider.getHistory(symbol, window));
    } catch (err) {
      sendError(res, err);
    }
  });

  return app;
}

function sendError(res: express.Response, err: unknown) {
  const e =
    err instanceof MarketDataError ? err : new MarketDataError('UPSTREAM_ERROR', 'Unexpected server error.');
  res.status(STATUS[e.code]).json({ code: e.code, message: e.message });
}

// Start only when run directly (not when imported by tests).
if (process.argv[1] && /server[\\/]index\.(ts|js)$/.test(process.argv[1])) {
  const port = Number(process.env.PORT ?? 3001);
  createApp(new YahooProvider()).listen(port, () => {
    console.log(`Finance API listening on http://localhost:${port}`);
  });
}
