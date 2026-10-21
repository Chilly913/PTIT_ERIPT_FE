/**
 * Chart colours resolved at paint time from CSS variables, so light/dark follow the theme.
 * Dedicated `--chart-*` tokens win when the design system defines them; otherwise the
 * semantic tokens are used. Values are solid colours only.
 */
export const chartColors = {
  series1: "var(--chart-1, var(--primary, #4338ca))",
  series2: "var(--chart-2, var(--info, #0369a1))",
  series3: "var(--chart-3, var(--warning, #a16207))",
  series4: "var(--chart-4, var(--success, #15803d))",
  // Status colours keep their meaning in both themes (unlike the categorical series above).
  success: "var(--success, #15803d)",
  warning: "var(--warning, #a16207)",
  info: "var(--info, #0369a1)",
  danger: "var(--danger, #c62828)",
  neutral: "var(--muted, #5d6580)",
  grid: "var(--chart-grid, var(--border, #dfe3ee))",
  axis: "var(--chart-axis, var(--muted, #5d6580))",
  cursor: "var(--chart-cursor, var(--surface-muted, #f0f2f8))",
  surface: "var(--surface, #ffffff)",
} as const;
