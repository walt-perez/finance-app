import type { Series } from '../../../shared/types';
import { rankByChange } from '../../services/normalize';

interface Props {
  series: Series[];
  label: string;
}

export function PerformanceTable({ series, label }: Props) {
  const ranked = rankByChange(series);
  return (
    <table className="ranking">
      <caption>{label}</caption>
      <thead>
        <tr>
          <th>#</th>
          <th>Symbol</th>
          <th>Change</th>
        </tr>
      </thead>
      <tbody>
        {ranked.map((r, i) => (
          <tr key={r.symbol}>
            <td>{i + 1}</td>
            <td>{r.symbol}</td>
            <td>{r.changePercent === null ? 'n/a' : `${r.changePercent.toFixed(2)}%`}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
