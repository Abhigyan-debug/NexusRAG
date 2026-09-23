// Recharts renders SVG, whose presentation attributes accept CSS variables,
// so these follow the active theme without re-rendering.
export const chartColors = {
  axis: 'rgb(var(--nx-muted))',
  grid: 'rgb(var(--nx-border))',
  accent: 'rgb(var(--nx-accent))',
  cyan: 'rgb(var(--nx-cyan))',
  cursor: 'rgb(var(--nx-overlay) / 0.06)',
};

export const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'rgb(var(--nx-panel))',
    border: '1px solid rgb(var(--nx-border))',
    borderRadius: '8px',
    boxShadow: '0 8px 24px -12px rgba(0, 0, 0, 0.35)',
  },
  itemStyle: { color: 'rgb(var(--nx-text))' },
  labelStyle: { color: 'rgb(var(--nx-heading))', fontWeight: 600 },
};

export const PIE_COLORS = ['#6366f1', '#a855f7', '#22d3ee', '#10b981', '#f59e0b', '#ec4899'];
