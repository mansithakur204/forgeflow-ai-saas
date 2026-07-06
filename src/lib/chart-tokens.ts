// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Chart Color Token System
// Typed constants for Recharts / Chart.js / D3 / Visx
// All colors have light and dark variants; use the active set via CSS vars.
// ─────────────────────────────────────────────────────────────────────────────

export const CHART_COLORS = {
  /** Primary brand — deep indigo */
  brand: "var(--color-chart-brand)",
  /** Violet / secondary brand */
  violet: "var(--color-chart-violet)",
  /** Teal — cool accent */
  teal: "var(--color-chart-teal)",
  /** Emerald — success */
  emerald: "var(--color-chart-emerald)",
  /** Amber — warning */
  amber: "var(--color-chart-amber)",
  /** Rose — error / danger */
  rose: "var(--color-chart-rose)",
  /** Sky — info */
  sky: "var(--color-chart-sky)",
  /** Purple — supplementary */
  purple: "var(--color-chart-purple)",
} as const;

/** Ordered palette — use this for multi-series charts */
export const CHART_PALETTE: string[] = [
  CHART_COLORS.brand,
  CHART_COLORS.violet,
  CHART_COLORS.teal,
  CHART_COLORS.emerald,
  CHART_COLORS.amber,
  CHART_COLORS.rose,
  CHART_COLORS.sky,
  CHART_COLORS.purple,
];

/** A 5-step palette for categorical data */
export const CHART_CATEGORICAL = [
  CHART_COLORS.brand,
  CHART_COLORS.teal,
  CHART_COLORS.amber,
  CHART_COLORS.rose,
  CHART_COLORS.violet,
];

/** Semantic aliases */
export const CHART_SEMANTIC = {
  success: CHART_COLORS.emerald,
  warning: CHART_COLORS.amber,
  danger: CHART_COLORS.rose,
  info: CHART_COLORS.sky,
  neutral: "var(--color-muted-foreground)",
} as const;

/**
 * Returns a color from the palette by index, wrapping around if needed.
 * Safe for dynamic series counts.
 */
export function getChartColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}

/**
 * Generate N colors from the chart palette.
 */
export function getChartColors(count: number): string[] {
  return Array.from({ length: count }, (_, i) => getChartColor(i));
}

// ── Recharts-compatible config helpers ───────────────────────────────────────

/**
 * Recharts CartesianGrid stroke — subtle, theme-aware
 */
export const CHART_GRID_STROKE = "var(--color-border)";

/**
 * Recharts axis tick / label color
 */
export const CHART_AXIS_COLOR = "var(--color-muted-foreground)";

/**
 * Recharts tooltip background
 */
export const CHART_TOOLTIP_BG = "var(--color-card)";
export const CHART_TOOLTIP_BORDER = "var(--color-border)";

/**
 * Recharts font config
 */
export const CHART_FONT = {
  fontFamily: "var(--font-sans)",
  fontSize: 12,
};

// ── Area chart gradient helpers ───────────────────────────────────────────────

/**
 * SVG linearGradient definition for smooth area charts.
 * Use inside a <defs> block in your chart SVG.
 *
 * @example
 * <defs>
 *   {CHART_AREA_GRADIENTS.brand}
 * </defs>
 * <Area fill="url(#gradient-brand)" ... />
 */
export const CHART_AREA_GRADIENT_IDS = {
  brand: "gradient-brand",
  violet: "gradient-violet",
  teal: "gradient-teal",
  emerald: "gradient-emerald",
  amber: "gradient-amber",
  rose: "gradient-rose",
} as const;

export type ChartColorKey = keyof typeof CHART_COLORS;
export type ChartPaletteItem = (typeof CHART_PALETTE)[number];
