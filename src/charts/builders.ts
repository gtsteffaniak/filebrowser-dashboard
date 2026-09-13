import type { ChartConfiguration } from 'chart.js';
import type { ColumnarBreakdown, FlagBreakdown, WindowData } from '../types/dashboard-v1';
import { matchesVersionTrain } from '../utils/versions';
import {
  baseOptions,
  chartColors,
  chartColorsForLabels,
  chartGradientColors,
  doughnutOptions,
  segmentBorderColors,
} from './chartTheme';

function col(cfg: ChartConfiguration): ChartConfiguration {
  return cfg;
}

export function barH(
  labels: string[],
  values: number[],
  group: string,
  compact: boolean,
  horizontal = true,
  gradient = false,
): ChartConfiguration {
  const colors = gradient ? chartGradientColors(group, labels.length) : chartColorsForLabels(group, labels);
  const borders = gradient ? labels.map(() => 'transparent') : segmentBorderColors(colors);
  return col({
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 2,
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
): ChartConfiguration {
  const colors = gradient ? chartGradientColors(group, labels.length) : chartColorsForLabels(group, labels);
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
    } as ChartConfiguration<'doughnut'>['options'],
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
): ChartConfiguration {
  const color = chartColors(group, 1)[0];
  return col({
    type: 'line',
    data: {
      labels: bucketLabels,
      datasets: [{
        label,
        data: values,
        borderColor: color,
        backgroundColor: color + (fill ? '44' : '00'),
        fill,
        tension: 0.35,
        pointRadius: compact ? 2 : 4,
      }],
    },
    options: {
      ...baseOptions(compact),
      plugins: { ...baseOptions(compact).plugins, legend: { display: !compact } },
    },
  });
}

export function buildTimeseriesChart(
  bucketLabels: string[],
  values: number[],
  label: string,
  group: string,
  compact: boolean,
  chartType: 'line' | 'area' | 'bar' | 'bar-h' = 'line',
): ChartConfiguration {
  if (chartType === 'bar') return barH(bucketLabels, values, group, compact, false, true);
  if (chartType === 'bar-h') return barH(bucketLabels, values, group, compact, true, true);
  return lineSingle(bucketLabels, values, label, group, compact, chartType === 'area');
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
