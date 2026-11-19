import type { TimeWindow } from '../../../shared/types';

export const WINDOW_LABELS: Record<TimeWindow, string> = {
  '1d': 'Current day',
  '7d': 'Last 7 days',
  '3m': 'Last quarter',
};

interface Props {
  value: TimeWindow;
  onChange: (window: TimeWindow) => void;
}

/** Controlled tab bar with no data knowledge. */
export function WindowTabs({ value, onChange }: Props) {
  return (
    <div role="tablist" aria-label="Time window" className="tabs">
      {(Object.keys(WINDOW_LABELS) as TimeWindow[]).map((w) => (
        <button
          key={w}
          role="tab"
          aria-selected={value === w}
          className={value === w ? 'tab active' : 'tab'}
          onClick={() => onChange(w)}
        >
          {WINDOW_LABELS[w]}
        </button>
      ))}
    </div>
  );
}
