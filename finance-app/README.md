# IBM Market Dashboard

React + TypeScript dashboard comparing IBM with up to four competitors across three time windows: current day, last 7 days, last quarter.

## Run locally

Requires Node 22.12 or newer (`yahoo-finance2` v4, Vite 6 and Vitest 4).

```bash
npm ci
npm run dev                         # offline demo using the mock data source

# Live Yahoo Finance data (two terminals)
npm run dev:server                  # Express proxy on :3001
npm run dev:live                    # Vite on :5173, VITE_DATA_SOURCE=api
```

If the page shows "Market data service unavailable … Is the API server running?" in live mode, start `npm run dev:server`.

## Validate

| Command | What it checks |
|---|---|
| `npm run check` | **Everything below, in order. Run this before every push.** |
| `npm run lint` | ESLint (typescript-eslint, react-hooks) |
| `npm run typecheck` | `tsc --noEmit` over `src`, `server` and `shared` |
| `npm test` | All tests once, no coverage |
| `npm run test:coverage` | Tests plus coverage thresholds (CI runs this) |
| `npm run test:watch` | Tests in watch mode while developing |
| `npm run build` | Typecheck and production bundle |

Run one file with `npx vitest run src/services/normalize.test.ts`. The HTML coverage report is written to `coverage/index.html`.

### What success looks like

`npm run check` exits with code 0, and you see:

- **Lint and typecheck:** no output after the `> eslint .` and `> tsc --noEmit` lines.
- **Tests:** `Test Files 12 passed (12)` and `Tests 99 passed (99)`, or more as tests are added. No failures, skips or `Errors` line.
- **Coverage:** `All files` at or above the thresholds in `vite.config.ts` (95% statements, lines and functions, 90% branches). Currently about 97% / 95% / 98%.
- **Build:** `✓ built in …ms`. The 500 kB chunk-size notice is a known warning (mostly Recharts), not a failure.

If coverage falls below a threshold, the run fails with `ERROR: Coverage for … does not meet global threshold`. Add tests for the new code instead of lowering the threshold.

### What is tested

| Area | Tests | Examples |
|---|---|---|
| Data transformation | `normalize.test.ts`, `yahooMapping.test.ts` | percent change, rebasing to 100, ranking, null closes, uneven series, exchange-timezone session, no fabricated zeros |
| Validation | `validation.test.ts`, `routes.test.ts` | symbol format, window enum, 5-symbol limit, error code to HTTP status, no leaked internals |
| Data sources | `YahooProvider.test.ts`, `apiProvider.test.ts`, `mockProvider.test.ts` | one batched Yahoo call, error mapping, request URLs, network and proxy failures |
| Configuration | `companies.test.ts` | IBM first, at most five, unique symbols and colors |
| Hooks | `hooks.test.tsx` | loading, per-symbol error isolation, refetch on window change, late responses ignored |
| UI rendering | `components.test.tsx`, `DashboardPage.test.tsx`, `App.test.tsx` | quote cards, loading/error/empty states, tabs, ranking table, partial and total failure, window switching |

Tests and CI never call Yahoo. They use `MockProvider` or an injected fake. To check the real data source, run `npm run dev:server` and open `http://localhost:3001/api/quotes?symbols=IBM`.

## Layout

| Path | Purpose |
|---|---|
| `shared/` | Types, `MarketDataProvider` interface and input validation, used by client and server |
| `server/` | Express proxy (`/api/quotes`, `/api/history`) and `YahooProvider`. Yahoo does not allow browser CORS |
| `src/config/companies.ts` | The company list (IBM + up to 4). Add a company here to add it everywhere |
| `src/services/` | `marketData` entry point, `MockProvider`, `ApiProvider`, pure `normalize.ts` |
| `src/hooks/` | `useQuotes`, `useHistory` (per-symbol error isolation) |
| `src/components/` | Presentational pieces: `ChartCard`, `ComparisonLineChart`, `QuoteCard`, `PerformanceTable`, `WindowTabs`, feedback states |
| `src/pages/DashboardPage.tsx` | The only component that composes hooks and presentation |

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the design rules.

## Conventions

- Components never call `fetch` or import `yahoo-finance2`; they use hooks, which use a `MarketDataProvider`.
- A new data source implements `MarketDataProvider`.
- Tests use `MockProvider`; CI never calls Yahoo.
- In hook and page tests, create the provider once outside `renderHook`/`render` callbacks. A provider created inside the callback changes on every render and causes an infinite fetch loop.
