export type ModalChartType =
  | 'bar'
  | 'bar-h'
  | 'doughnut'
  | 'pie'
  | 'line'
  | 'area'
  | 'pct-bar'
  | 'stacked-area'
  | 'stacked-bar';

export interface ModalBuildOptions {
  chartType?: ModalChartType;
}

export interface ModalControlsConfig {
  chartTypes?: ModalChartType[];
  /** Enable pan/zoom and show reset button (line + bar charts). */
  zoom?: boolean;
}

export const DEFAULT_MODAL_OPTS: ModalBuildOptions = {
  chartType: undefined,
};

export const CHART_TYPE_LABELS: Record<ModalChartType, string> = {
  line: 'Line',
  area: 'Area',
  bar: 'Bar (vertical)',
  'bar-h': 'Bar (horizontal)',
  doughnut: 'Doughnut',
  pie: 'Pie',
  'pct-bar': 'Percent bar',
  'stacked-area': 'Stacked area (100%)',
  'stacked-bar': 'Stacked bar (100%)',
};

/** Single-metric time series (counts, averages, durations). */
export const TIMESERIES_MODAL_TYPES: ModalChartType[] = ['line', 'area', 'bar', 'bar-h'];

/** Distribution / range histogram panels. */
export const RANGE_MODAL_TYPES: ModalChartType[] = ['bar', 'bar-h', 'doughnut', 'pie'];

/** Categorical snapshot breakdowns (countries, OS, runtime). */
export const COLUMNAR_MODAL_TYPES: ModalChartType[] = ['bar-h', 'bar', 'doughnut', 'pie'];

/** Boolean flag adoption panels (auth, integrations, features). */
export const FLAG_MODAL_TYPES: ModalChartType[] = ['pct-bar', 'bar-h', 'bar', 'doughnut', 'pie'];

/** Mutually exclusive composition over time (versions, stable/beta). */
export const COMPOSITION_MODAL_TYPES: ModalChartType[] = [
  'stacked-area',
  'stacked-bar',
  'line',
  'area',
  'bar',
  'bar-h',
];

/** bar-h → horizontal, bar → vertical. */
export function isHorizontalBar(modal?: ModalBuildOptions, defaultHorizontal = true): boolean {
  if (modal?.chartType === 'bar-h') return true;
  if (modal?.chartType === 'bar') return false;
  return defaultHorizontal;
}

export function supportsZoom(chartType?: ModalChartType): boolean {
  return (
    chartType === 'line' ||
    chartType === 'area' ||
    chartType === 'bar' ||
    chartType === 'bar-h' ||
    chartType === 'stacked-area' ||
    chartType === 'stacked-bar'
  );
}

export function isCircularChart(chartType?: ModalChartType): boolean {
  return chartType === 'doughnut' || chartType === 'pie';
}
