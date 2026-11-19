import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Series, TimeWindow } from '../../../shared/types';
import { COMPANIES } from '../../config/companies';
import { buildComparisonRows } from '../../services/normalize';

interface Props {
  series: Series[];
  window: TimeWindow;
}

function formatTick(iso: string, window: TimeWindow): string {
  const d = new Date(iso);
  return window === '1d'
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/** Pure presentational chart: all series rebased to 100 so companies are comparable. */
export function ComparisonLineChart({ series, window }: Props) {
  const rows = buildComparisonRows(series);
  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <LineChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tickFormatter={(t: string) => formatTick(t, window)} minTickGap={32} />
          <YAxis domain={['auto', 'auto']} tickFormatter={(v: number) => v.toFixed(0)} />
          <Tooltip
            labelFormatter={(t: string) => new Date(t).toLocaleString()}
            formatter={(v: number) => v.toFixed(2)}
          />
          <Legend />
          {series.map((s) => {
            const company = COMPANIES.find((c) => c.symbol === s.symbol);
            return (
              <Line
                key={s.symbol}
                type="monotone"
                dataKey={s.symbol}
                name={company?.name ?? s.symbol}
                stroke={company?.color ?? '#666'}
                strokeWidth={s.symbol === 'IBM' ? 3 : 1.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
