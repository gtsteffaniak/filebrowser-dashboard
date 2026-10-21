import type { ChartConfiguration, ChartOptions } from 'chart.js';
import type { ColumnarBreakdown, FlagBreakdown, WindowData } from '../types/dashboard-v1';
import type { FlagSpec } from '../utils/flags';
import { matchesVersionTrain } from '../utils/versions';
import {
  baseOptions,
  chartColors,
  chartColorsForLabels,
  chartGradientColors,
  doughnutOptions,
  segmentBorderColors,
} from './chartTheme';

export type ValueFormatter = (value: number) => string;

function col(cfg: ChartConfiguration): ChartConfiguration {
  return cfg;
}

function yTickOptions(formatter?: ValueFormatter, integerTicks?: boolean) {
  return {
    // Do not use stepSize: 1 — large medians (e.g. file counts) blow tick limits.
    ...(integerTicks ? { precision: 0, maxTicksLimit: 10 } : {}),
    ...(formatter
      ? {
          callback: (value: string | number) => formatter(typeof value === 'number' ? value : Number(value)),
        }
      : {}),
  };
}

export function withValueFormat(
  options: ChartOptions,
  formatter?: ValueFormatter,
  integerTicks?: boolean,
): ChartOptions {
  if (!formatter && !integerTicks) return options;
  const y = options.scales?.y ?? {};
  const ticks = { ...(typeof y === 'object' && y && 'ticks' in y ? y.ticks : {}), ...yTickOptions(formatter, integerTicks) };
  return {
    ...options,
    scales: {
      ...options.scales,
      y: {
        ...(typeof y === 'object' ? y : {}),
        ticks,
      },
    },
    plugins: {
      ...options.plugins,
      tooltip: {
        ...options.plugins?.tooltip,
        callbacks: {
          ...options.plugins?.tooltip?.callbacks,
          ...(formatter
            ? {
                label: (ctx) => {
                  const raw = typeof ctx.parsed.y === 'number' ? ctx.parsed.y : Number(ctx.parsed.y ?? 0);
                  const name = ctx.dataset.label ? `${ctx.dataset.label}: ` : '';
                  return `${name}${formatter(raw)}`;
                },
              }
            : {}),
        },
      },
    },
  };
}

export function barH(
  labels: string[],
  values: (number | null)[],
  group: string,
  compact: boolean,
  horizontal = true,
  gradient = false,
  flags?: (FlagSpec | undefined)[],
): ChartConfiguration {
  const colors = gradient ? chartGradientColors(group, labels.length) : chartColorsForLabels(group, labels);
  const baseBorders = gradient ? labels.map(() => 'transparent') : segmentBorderColors(colors);
  const borders = flags
    ? baseBorders.map((b, i) => (flags[i] ? (flags[i]!.border ?? flags[i]!.b) : b))
    : baseBorders;
  const backgroundColor = flags
    ? (context: {
        dataIndex: number;
        parsed?: { x?: number | null; y?: number | null };
        chart: {
          ctx: CanvasRenderingContext2D;
          scales?: {
            x?: { getPixelForValue: (v: number) => number };
            y?: { getPixelForValue: (v: number) => number };
          };
        };
      }) => {
        const flag = flags[context.dataIndex];
        if (!flag) return colors[context.dataIndex] ?? 'transparent';
        if (!flag.border || flag.a === flag.b) return flag.a;
        const { ctx, scales } = context.chart;
        const parsed = context.parsed;
        const xScale = scales?.x;
        const yScale = scales?.y;
        if (!ctx || !xScale || !yScale || !parsed) return flag.a;
        const midX = horizontal
          ? (xScale.getPixelForValue(0) + xScale.getPixelForValue(parsed.x ?? 0)) / 2
          : xScale.getPixelForValue(context.dataIndex);
        const midY = horizontal
          ? yScale.getPixelForValue(context.dataIndex)
          : (yScale.getPixelForValue(0) + yScale.getPixelForValue(parsed.y ?? 0)) / 2;
        if (!Number.isFinite(midX) || !Number.isFinite(midY)) return flag.a;
        const span = 12;
        const g = ctx.createLinearGradient(midX - span, midY - span, midX + span, midY + span);
        g.addColorStop(0, flag.a);
        g.addColorStop(0.49, flag.a);
        g.addColorStop(0.51, flag.b);
        g.addColorStop(1, flag.b);
        return g;
      }
    : colors;
  return col({
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor,
        borderColor: borders,
        borderWidth: compact ? 1 : 2,
        borderRadius: 6,
      }],
    },
    options: {
      ...baseOptions(compact),
      indexAxis: horizontal ? 'y' : 'x',
      plugins: { ...baseOptions(compact).plugins, legend: { display: false } },
    },
  });
}

export function circularBreakdown(
  labels: string[],
  values: number[],
  group: string,
  compact: boolean,
  variant: 'doughnut' | 'pie',
  gradient = false,
  colorOverrides?: (string | undefined)[],
): ChartConfiguration {
  const colors = gradient
    ? chartGradientColors(group, labels.length)
    : chartColorsForLabels(group, labels, colorOverrides);
  const borders = segmentBorderColors(colors);
  const baseOpts = doughnutOptions(compact) ?? {};
  return col({
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: borders,
      }],
    },
    options: {
      ...baseOpts,
      cutout: variant === 'pie' ? '0%' : (baseOpts.cutout ?? '58%'),
    } as ChartConfiguration['options'],
  });
}

export function doughnut(
  data: ColumnarBreakdown,
  group: string,
  compact: boolean,
): ChartConfiguration {
  return circularBreakdown(data.labels, data.values, group, compact, 'doughnut');
}

export function pctBar(
  data: FlagBreakdown,
  group: string,
  compact: boolean,
  horizontal = false,
): ChartConfiguration {
  const pct = data.enabled_pct.map((p) => Math.round(p * 100));
  const colors = chartColorsForLabels(group, data.labels);
  return col({
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [{
        data: pct,
        backgroundColor: colors,
        borderRadius: 6,
      }],
    },
    options: {
      ...baseOptions(compact),
      indexAxis: horizontal ? 'y' : 'x',
      plugins: { ...baseOptions(compact).plugins, legend: { display: false } },
      scales: {
        x: {
          ticks: {
            color: undefined,
            maxRotation: horizontal ? 0 : 35,
            ...(horizontal ? { callback: (v) => `${v}%` } : {}),
          },
          grid: baseOptions(compact).scales?.x?.grid,
          ...(horizontal ? { max: 100 } : {}),
        },
        y: {
          ...baseOptions(compact).scales?.y,
          ...(!horizontal ? { max: 100, ticks: { callback: (v) => `${v}%` } } : {}),
        },
      },
    },
  });
}

/** Normalize each time bucket so series values sum to 100%. */
export function normalizeSeriesToPercent(seriesData: number[][]): number[][] {
  const bucketCount = seriesData[0]?.length ?? 0;
  const result = seriesData.map(() => Array<number>(bucketCount).fill(0));
  for (let i = 0; i < bucketCount; i++) {
    const total = seriesData.reduce((sum, s) => sum + (s[i] ?? 0), 0);
    if (total <= 0) continue;
    for (let j = 0; j < seriesData.length; j++) {
      result[j][i] = Math.round((100 * (seriesData[j][i] ?? 0)) / total * 10) / 10;
    }
  }
  return result;
}

export function stackedComposition(
  bucketLabels: string[],
  seriesLabels: string[],
  seriesData: number[][],
  group: string,
  compact: boolean,
  mode: 'area' | 'bar',
): ChartConfiguration {
  const colors = chartColorsForLabels(group, seriesLabels);
  const stacked = mode === 'area' ? 'line' : 'bar';
  return col({
    type: stacked,
    data: {
      labels: bucketLabels,
      datasets: seriesLabels.map((label, i) => ({
        label,
        data: seriesData[i],
        borderColor: colors[i],
        backgroundColor: colors[i] + (mode === 'area' ? 'cc' : 'ff'),
        fill: mode === 'area',
        stack: 'composition',
        tension: mode === 'area' ? 0.35 : 0,
        pointRadius: mode === 'area' ? (compact ? 0 : 3) : 0,
        borderWidth: mode === 'area' ? 2 : 0,
        borderRadius: mode === 'bar' ? 4 : 0,
      })),
    },
    options: {
      ...baseOptions(compact),
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          stacked: true,
          ticks: { color: undefined, maxRotation: compact ? 0 : 45 },
          grid: baseOptions(compact).scales?.x?.grid,
        },
        y: {
          stacked: true,
          min: 0,
          max: 100,
          ticks: {
            callback: (v) => `${v}%`,
          },
          grid: baseOptions(compact).scales?.y?.grid,
        },
      },
      plugins: {
        ...baseOptions(compact).plugins,
        tooltip: {
          ...baseOptions(compact).plugins?.tooltip,
          callbacks: {
            label: (ctx) => {
              const value = typeof ctx.parsed.y === 'number' ? ctx.parsed.y : 0;
              return `${ctx.dataset.label}: ${value}%`;
            },
          },
        },
      },
    },
  });
}

export function lineMulti(
  bucketLabels: string[],
  seriesLabels: string[],
  seriesData: number[][],
  group: string,
  compact: boolean,
  filterVersion?: string,
  versionLabels?: string[],
  fill = false,
): ChartConfiguration {
  let labels = seriesLabels;
  let data = seriesData;
  if (filterVersion && filterVersion !== 'all' && versionLabels) {
    const idx = versionLabels
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => matchesVersionTrain(v, filterVersion))
      .map(({ i }) => i);
    labels = idx.map((i) => seriesLabels[i]);
    data = idx.map((i) => seriesData[i]);
  }
  const colors = chartColorsForLabels(group, labels);
  return col({
    type: 'line',
    data: {
      labels: bucketLabels,
      datasets: labels.map((label, i) => ({
        label,
        data: data[i],
        borderColor: colors[i],
        backgroundColor: colors[i] + (fill ? '44' : '33'),
        fill,
        tension: 0.35,
        pointRadius: compact ? 2 : 4,
      })),
    },
    options: baseOptions(compact),
  });
}

export function groupedBarMulti(
  bucketLabels: string[],
  seriesLabels: string[],
  seriesData: number[][],
  group: string,
  compact: boolean,
  horizontal = false,
): ChartConfiguration {
  const colors = chartColorsForLabels(group, seriesLabels);
  return col({
    type: 'bar',
    data: {
      labels: bucketLabels,
      datasets: seriesLabels.map((label, i) => ({
        label,
        data: seriesData[i],
        backgroundColor: colors[i],
        borderRadius: 4,
      })),
    },
    options: {
      ...baseOptions(compact),
      indexAxis: horizontal ? 'y' : 'x',
      scales: {
        x: {
          ticks: { maxRotation: horizontal ? 0 : 45 },
          grid: baseOptions(compact).scales?.x?.grid,
        },
        y: baseOptions(compact).scales?.y,
      },
    },
  });
}

export function lineSingle(
  bucketLabels: string[],
  values: number[],
  label: string,
  group: string,
  compact: boolean,
  fill = true,
  formatter?: ValueFormatter,
  integerTicks?: boolean,
  skipZeros = false,
): ChartConfiguration {
  const color = chartColors(group, 1)[0];
  const options = withValueFormat(
    {
      ...baseOptions(compact),
      plugins: { ...baseOptions(compact).plugins, legend: { display: !compact } },
    },
    formatter,
    integerTicks,
  );
  return col({
    type: 'line',
    data: {
      labels: bucketLabels,
      datasets: [{
        label,
        data: skipZeros ? values.map((v) => (v === 0 ? null : v)) : values,
        borderColor: color,
        backgroundColor: color + (fill ? '44' : '00'),
        fill,
        tension: 0.35,
        spanGaps: skipZeros,
        pointRadius: compact ? 2 : 4,
      }],
    },
    options,
  });
}

export function buildTimeseriesChart(
  bucketLabels: string[],
  values: number[],
  label: string,
  group: string,
  compact: boolean,
  chartType: 'line' | 'area' | 'bar' | 'bar-h' = 'line',
  formatter?: ValueFormatter,
  integerTicks?: boolean,
  skipZeros = false,
): ChartConfiguration {
  const data = skipZeros ? values.map((v) => (v === 0 ? null : v)) : values;
  if (chartType === 'bar') {
    const cfg = barH(bucketLabels, data, group, compact, false, true);
    return { ...cfg, options: withValueFormat(cfg.options ?? {}, formatter, integerTicks) };
  }
  if (chartType === 'bar-h') {
    const cfg = barH(bucketLabels, data, group, compact, true, true);
    return { ...cfg, options: withValueFormat(cfg.options ?? {}, formatter, integerTicks) };
  }
  return lineSingle(
    bucketLabels,
    values,
    label,
    group,
    compact,
    chartType === 'area',
    formatter,
    integerTicks,
    skipZeros,
  );
}

export function rangeBar(
  rangeLabels: string[],
  values: number[],
  group: string,
  compact: boolean,
  horizontal = false,
): ChartConfiguration {
  const colors = chartGradientColors(group, values.length);
  return col({
    type: 'bar',
    data: {
      labels: rangeLabels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderRadius: 6,
      }],
    },
    options: {
      ...baseOptions(compact),
      indexAxis: horizontal ? 'y' : 'x',
      plugins: { ...baseOptions(compact).plugins, legend: { display: false } },
      scales: {
        x: {
          ticks: { maxRotation: horizontal ? 0 : 40 },
          grid: baseOptions(compact).scales?.x?.grid,
        },
        y: baseOptions(compact).scales?.y,
      },
    },
  });
}

export function bucketLabels(win: WindowData): string[] {
  return win.buckets.map((b) => b.label);
}
