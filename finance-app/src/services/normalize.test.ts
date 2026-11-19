import { describe, expect, it } from 'vitest';
import type { Series } from '../../shared/types';
import { buildComparisonRows, percentChange, rankByChange } from './normalize';

const series = (symbol: string, closes: (number | null)[]): Series => ({
  symbol,
  window: '7d',
  points: closes.map((close, i) => ({ time: `2026-01-0${i + 1}T00:00:00.000Z`, close })),
});

describe('percentChange', () => {
  it('computes change between first and last valid close', () => {
    expect(percentChange(series('A', [100, 110]))).toBeCloseTo(10);
  });

  it('ignores null points at the edges', () => {
    expect(percentChange(series('A', [null, 100, 150, null]))).toBeCloseTo(50);
  });

  it('returns null when fewer than two valid points exist', () => {
    expect(percentChange(series('A', [100, null]))).toBeNull();
  });
});

describe('buildComparisonRows', () => {
  it('rebases every series to 100 and merges by timestamp', () => {
    const rows = buildComparisonRows([series('A', [50, 100]), series('B', [200, 100])]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ A: 100, B: 100 });
    expect(rows[1]).toMatchObject({ A: 200, B: 50 });
  });

  it('keeps null closes as null and skips series with no valid data', () => {
    const rows = buildComparisonRows([series('A', [100, null]), series('B', [null, null])]);
    expect(rows[1].A).toBeNull();
    expect(rows[0]).not.toHaveProperty('B');
  });
});

describe('rankByChange', () => {
  it('orders best to worst with unavailable symbols last', () => {
    const ranked = rankByChange([series('A', [100, 101]), series('B', [100, 120]), series('C', [null, null])]);
    expect(ranked.map((r) => r.symbol)).toEqual(['B', 'A', 'C']);
  });
});
