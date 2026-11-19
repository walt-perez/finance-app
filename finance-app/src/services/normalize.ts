import type { PricePoint, Series } from '../../shared/types';

export interface ChartRow {
  time: string;
  [symbol: string]: number | string | null;
}

function firstAndLast(points: PricePoint[]): [number, number] | null {
  const valid = points.filter((p): p is PricePoint & { close: number } => p.close !== null);
  if (valid.length < 2) return null;
  return [valid[0].close, valid[valid.length - 1].close];
}

/** Percent change from the first to the last valid close, or null if not computable. */
export function percentChange(series: Series): number | null {
  const range = firstAndLast(series.points);
  if (!range || range[0] === 0) return null;
  return ((range[1] - range[0]) / range[0]) * 100;
}

/**
 * Merge several series into Recharts rows, rebasing each to 100 at its first valid
 * close so companies with very different share prices are comparable.
 */
export function buildComparisonRows(seriesList: Series[]): ChartRow[] {
  const rows = new Map<string, ChartRow>();
  for (const series of seriesList) {
    const base = series.points.find((p) => p.close !== null)?.close;
    if (!base) continue;
    for (const p of series.points) {
      const row = rows.get(p.time) ?? { time: p.time };
      row[series.symbol] = p.close === null ? null : (p.close / base) * 100;
      rows.set(p.time, row);
    }
  }
  return [...rows.values()].sort((a, b) => a.time.localeCompare(b.time));
}

/** Symbols ordered best-to-worst by percent change; unavailable symbols last. */
export function rankByChange(seriesList: Series[]): { symbol: string; changePercent: number | null }[] {
  return seriesList
    .map((s) => ({ symbol: s.symbol, changePercent: percentChange(s) }))
    .sort((a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity));
}
