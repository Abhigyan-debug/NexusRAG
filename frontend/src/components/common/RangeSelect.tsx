import type { AnalyticsRange } from '../../types';

export const RANGE_LABELS: Record<AnalyticsRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '12m': 'Last 12 months',
};

export const RANGE_COMPARE_LABELS: Record<AnalyticsRange, string> = {
  '7d': 'vs previous 7 days',
  '30d': 'vs previous 30 days',
  '12m': 'vs previous 12 months',
};

export default function RangeSelect({
  value,
  onChange,
}: {
  value: AnalyticsRange;
  onChange: (range: AnalyticsRange) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as AnalyticsRange)}
      aria-label="Time range"
      className="bg-nexus-bg text-nexus-text border border-nexus-border text-sm rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:border-nexus-accent/40 focus:border-nexus-accent/60 transition-colors"
    >
      {(Object.keys(RANGE_LABELS) as AnalyticsRange[]).map((r) => (
        <option key={r} value={r}>
          {RANGE_LABELS[r]}
        </option>
      ))}
    </select>
  );
}
