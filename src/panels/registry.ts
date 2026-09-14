import type { ChartConfiguration } from 'chart.js';
import type { AppState } from '../app/state';
import type { DashboardV1, PanelGroup, WindowData } from '../types/dashboard-v1';
import {
  barH,
  bucketLabels,
  buildTimeseriesChart,
  circularBreakdown,
  doughnut,
  groupedBarMulti,
  lineMulti,
  lineSingle,
  normalizeSeriesToPercent,
  pctBar,
  rangeBar,
  stackedComposition,
  withValueFormat,
  type ValueFormatter,
} from '../charts/builders';
import type { FlagBreakdown } from '../types/dashboard-v1';
import type { ModalBuildOptions, ModalChartType, ModalControlsConfig } from './modalTypes';
import {
  COLUMNAR_MODAL_TYPES,
  COMPOSITION_MODAL_TYPES,
  FLAG_MODAL_TYPES,
  GROUPED_RANGE_MODAL_TYPES,
  RANGE_MODAL_TYPES,
  TIMESERIES_MODAL_TYPES,
  isHorizontalBar,
} from './modalTypes';
import type { DashboardSection } from './sections';
import { formatHostPlatformBreakdown, formatOsBreakdown } from '../utils/labels';
import { formatBytes } from '../utils/format';
import { filterVersionSeries } from '../utils/versions';

function modalChartType(modal?: ModalBuildOptions, types?: ModalChartType[]): ModalChartType | undefined {
  return modal?.chartType ?? types?.[0];
}

function buildFlagChart(
  data: FlagBreakdown,
  group: PanelGroup,
  compact: boolean,
  modal?: ModalBuildOptions,
): ChartConfiguration {
  const chartType = modalChartType(modal, FLAG_MODAL_TYPES) ?? 'pct-bar';
  if (chartType === 'doughnut' || chartType === 'pie') {
    return circularBreakdown(data.labels, data.values, group, compact, chartType);
  }
  if (chartType === 'pct-bar') return pctBar(data, group, compact, false);
  if (chartType === 'bar-h') return barH(data.labels, data.values, group, compact, true);
  return barH(data.labels, data.values, group, compact, false);
}

function buildCompositionChart(
  bucketLabels: string[],
  seriesLabels: string[],
  rawSeries: number[][],
  group: PanelGroup,
  compact: boolean,
  modal?: ModalBuildOptions,
  alreadyPercent = false,
): ChartConfiguration {
  const chartType = modalChartType(modal, COMPOSITION_MODAL_TYPES) ?? 'stacked-area';
  if (chartType === 'line') {
    return lineMulti(bucketLabels, seriesLabels, rawSeries, group, compact, undefined, undefined, false);
  }
  if (chartType === 'area') {
    return lineMulti(bucketLabels, seriesLabels, rawSeries, group, compact, undefined, undefined, true);
  }
  if (chartType === 'bar') {
    return groupedBarMulti(bucketLabels, seriesLabels, rawSeries, group, compact, false);
  }
  if (chartType === 'bar-h') {
    const totals = rawSeries.map((s) => s.reduce((a, b) => a + b, 0));
    return barH(seriesLabels, totals, group, compact, true);
  }
  const pct = alreadyPercent ? rawSeries : normalizeSeriesToPercent(rawSeries);
  const mode = chartType === 'stacked-bar' ? 'bar' : 'area';
  return stackedComposition(bucketLabels, seriesLabels, pct, group, compact, mode);
}

export interface PanelDef {
  id: string;
  title: string;
  group: PanelGroup;
  section?: DashboardSection;
  hero?: boolean;
  description?: string;
  isAvailable?: (win: WindowData) => boolean;
  modal?: ModalControlsConfig;
  build: (
    data: DashboardV1,
    win: WindowData,
    state: AppState,
    compact: boolean,
    modal?: ModalBuildOptions,
  ) => ChartConfiguration;
}

function rangeLabels(data: DashboardV1, key: string): string[] {
  return data.range_definitions[key]?.buckets.map((b) => b.label) ?? [];
}

function rangeVals(win: WindowData, key: string): number[] {
  return win.panels.ranges[key] ?? [];
}

type GroupedRangeSeries = { label: string; rangeKey: string };

function buildGroupedRangeChart(
  bucketLabels: string[],
  series: GroupedRangeSeries[],
  win: WindowData,
  group: PanelGroup,
  compact: boolean,
  modal?: ModalBuildOptions,
): ChartConfiguration {
  const seriesLabels = series.map((s) => s.label);
  const seriesData = series.map((s) => rangeVals(win, s.rangeKey));
  const chartType = modalChartType(modal, GROUPED_RANGE_MODAL_TYPES) ?? 'bar';
  if (chartType === 'doughnut' || chartType === 'pie') {
    const totals = seriesData.map((arr) => arr.reduce((a, b) => a + b, 0));
    return circularBreakdown(seriesLabels, totals, group, compact, chartType);
  }
  if (chartType === 'stacked-bar') {
    const pct = normalizeSeriesToPercent(seriesData);
    return stackedComposition(bucketLabels, seriesLabels, pct, group, compact, 'bar');
  }
  return groupedBarMulti(
    bucketLabels,
    seriesLabels,
    seriesData,
    group,
    compact,
    chartType === 'bar-h',
  );
}

function groupedRangePanel(
  id: string,
  title: string,
  description: string,
  group: PanelGroup,
  labelRangeKey: string,
  series: GroupedRangeSeries[],
  section: DashboardSection,
  opts?: { optionalRangeKeys?: string[] },
): PanelDef {
  const optionalKeys = opts?.optionalRangeKeys ?? [];
  return {
    id,
    title,
    description,
    group,
    section,
    isAvailable: optionalKeys.length
      ? (win) => optionalKeys.every((k) => Array.isArray(win.panels.ranges[k]))
      : undefined,
    modal: { chartTypes: GROUPED_RANGE_MODAL_TYPES, zoom: true },
    build: (d, win, _s, c, modal) =>
      buildGroupedRangeChart(rangeLabels(d, labelRangeKey), series, win, group, c, modal),
  };
}

function rangePanel(
  id: string,
  title: string,
  description: string,
  group: PanelGroup,
  rangeKey: string,
  section: DashboardSection,
  optional = false,
): PanelDef {
  return {
    id,
    title,
    description,
    group,
    section,
    isAvailable: optional ? (win) => Array.isArray(win.panels.ranges[rangeKey]) : undefined,
    modal: { chartTypes: RANGE_MODAL_TYPES, zoom: true },
    build: (d, win, _s, c, modal) => {
      const labels = rangeLabels(d, rangeKey);
      const values = rangeVals(win, rangeKey);
      const chartType = modalChartType(modal, RANGE_MODAL_TYPES) ?? 'bar';
      if (chartType === 'doughnut' || chartType === 'pie') {
        return circularBreakdown(labels, values, group, c, chartType, true);
      }
      return rangeBar(labels, values, group, c, isHorizontalBar(modal, false));
    },
  };
}

function columnarPanel(
  id: string,
  title: string,
  description: string,
  group: PanelGroup,
  getData: (win: WindowData) => { labels: string[]; values: number[] },
  section: DashboardSection,
  opts: {
    defaultHorizontal?: boolean;
    chartTypes?: ModalControlsConfig['chartTypes'];
    zoom?: boolean;
  } = {},
): PanelDef {
  const defaultHorizontal = opts.defaultHorizontal ?? true;
  return {
    id,
    title,
    description,
    group,
    section,
    modal: {
      chartTypes: opts.chartTypes ?? COLUMNAR_MODAL_TYPES,
      zoom: opts.zoom ?? true,
    },
    build: (_d, win, _s, c, modal) => {
      const data = getData(win);
      const types = opts.chartTypes ?? COLUMNAR_MODAL_TYPES;
      const chartType = modalChartType(modal, types) ?? 'bar-h';
      if (chartType === 'doughnut' || chartType === 'pie') {
        return circularBreakdown(data.labels, data.values, group, c, chartType);
      }
      return barH(data.labels, data.values, group, c, isHorizontalBar(modal, defaultHorizontal));
    },
  };
}

function timeseriesPanel(
  id: string,
  title: string,
  description: string,
  group: PanelGroup,
  valueKey: keyof WindowData['panels']['timeseries'],
  datasetLabel: string,
  section: DashboardSection,
  extra?: { formatter?: ValueFormatter; integerTicks?: boolean },
): PanelDef {
  return {
    id,
    title,
    description,
    group,
    section,
    modal: { chartTypes: TIMESERIES_MODAL_TYPES, zoom: true },
    build: (_d, win, _s, c, modal) => {
      const labels = bucketLabels(win);
      const values = (win.panels.timeseries[valueKey] as number[] | undefined) ?? [];
      if (!modal) {
        return lineSingle(labels, values, datasetLabel, group, c, true, extra?.formatter, extra?.integerTicks);
      }
      const chartType = modalChartType(modal, TIMESERIES_MODAL_TYPES) ?? 'line';
      if (chartType === 'line' || chartType === 'area' || chartType === 'bar' || chartType === 'bar-h') {
        return buildTimeseriesChart(
          labels,
          values,
          datasetLabel,
          group,
          c,
          chartType,
          extra?.formatter,
          extra?.integerTicks,
        );
      }
      return lineSingle(labels, values, datasetLabel, group, c, true, extra?.formatter, extra?.integerTicks);
    },
  };
}

function multiTimeseriesPanel(
  id: string,
  title: string,
  description: string,
  group: PanelGroup,
  seriesKeys: Array<{ key: keyof WindowData['panels']['timeseries']; label: string }>,
  section: DashboardSection,
  extra?: { formatter?: ValueFormatter; integerTicks?: boolean },
): PanelDef {
  return {
    id,
    title,
    description,
    group,
    section,
    modal: { chartTypes: TIMESERIES_MODAL_TYPES, zoom: true },
    build: (_d, win, _s, c, modal) => {
      const labels = bucketLabels(win);
      const ts = win.panels.timeseries;
      const seriesLabels = seriesKeys.map((s) => s.label);
      const seriesData = seriesKeys.map((s) => (ts[s.key] as number[] | undefined) ?? []);
      const chartType = modalChartType(modal, TIMESERIES_MODAL_TYPES) ?? 'line';
      const fill = chartType === 'area';
      if (chartType === 'bar' || chartType === 'bar-h') {
        const cfg = groupedBarMulti(labels, seriesLabels, seriesData, group, c, chartType === 'bar-h');
        return {
          ...cfg,
          options: withValueFormat(cfg.options ?? {}, extra?.formatter, extra?.integerTicks),
        };
      }
      const cfg = lineMulti(labels, seriesLabels, seriesData, group, c, undefined, undefined, fill);
      const options = withValueFormat(
        {
          ...cfg.options,
          plugins: {
            ...cfg.options?.plugins,
            legend: {
              ...cfg.options?.plugins?.legend,
              display: true,
              position: 'bottom',
            },
          },
        },
        extra?.formatter,
        extra?.integerTicks,
      );
      return { ...cfg, options };
    },
  };
}

function compositionTimeseriesPanel(
  id: string,
  title: string,
  description: string,
  group: PanelGroup,
  seriesKeys: Array<{ key: keyof WindowData['panels']['timeseries']; label: string }>,
  section: DashboardSection,
  opts: { alreadyPercent?: boolean } = {},
): PanelDef {
  const alreadyPercent = opts.alreadyPercent ?? true;
  return {
    id,
    title,
    description,
    group,
    section,
    modal: { chartTypes: COMPOSITION_MODAL_TYPES, zoom: true },
    build: (_d, win, _s, c, modal) => {
      const labels = bucketLabels(win);
      const ts = win.panels.timeseries;
      const seriesLabels = seriesKeys.map((s) => s.label);
      const raw = seriesKeys.map((s) => (ts[s.key] as number[] | undefined) ?? []);
      return buildCompositionChart(labels, seriesLabels, raw, group, c, modal, alreadyPercent);
    },
  };
}

export const PANELS: PanelDef[] = [
  {
    id: 'active-installations',
    title: 'Reported installations',
    group: 'overview',
    hero: true,
    description: 'How many installations sent usage data in each period.',
    modal: { chartTypes: TIMESERIES_MODAL_TYPES, zoom: true },
    build: (_d, win, _s, c, modal) => {
      const labels = bucketLabels(win);
      const values = win.panels.timeseries.active_installations;
      if (!modal) return lineSingle(labels, values, 'Installations', 'overview', c, true, undefined, true);
      const chartType = modalChartType(modal, TIMESERIES_MODAL_TYPES) ?? 'line';
      if (chartType === 'line' || chartType === 'area' || chartType === 'bar' || chartType === 'bar-h') {
        return buildTimeseriesChart(labels, values, 'Installations', 'overview', c, chartType, undefined, true);
      }
      return lineSingle(labels, values, 'Installations', 'overview', c, true, undefined, true);
    },
  },
  columnarPanel(
    'countries',
    'Country',
    'Where installations connect from.',
    'deployments',
    (w) => w.panels.countries,
    'how-it-runs',
    { defaultHorizontal: true, zoom: true },
  ),
  {
    id: 'os',
    title: 'Operating system',
    group: 'deployments',
    section: 'how-it-runs',
    description: 'Linux, Windows, macOS, and others.',
    modal: { chartTypes: COLUMNAR_MODAL_TYPES, zoom: true },
    build: (_d, win, _s, c, modal) => {
      const data = formatOsBreakdown(win.panels.os);
      if (!modal) return doughnut(data, 'deployments', c);
      const chartType = modalChartType(modal, COLUMNAR_MODAL_TYPES) ?? 'doughnut';
      if (chartType === 'doughnut' || chartType === 'pie') {
        return circularBreakdown(data.labels, data.values, 'deployments', c, chartType);
      }
      return barH(data.labels, data.values, 'deployments', c, isHorizontalBar(modal, true));
    },
  },
  {
    id: 'arch',
    title: 'CPU architecture',
    group: 'deployments',
    section: 'how-it-runs',
    description: '64-bit x86 vs ARM.',
    modal: { chartTypes: COLUMNAR_MODAL_TYPES, zoom: true },
    build: (_d, win, _s, c, modal) => {
      const data = win.panels.arch;
      if (!modal) return doughnut(data, 'deployments', c);
      const chartType = modalChartType(modal, COLUMNAR_MODAL_TYPES) ?? 'doughnut';
      if (chartType === 'doughnut' || chartType === 'pie') {
        return circularBreakdown(data.labels, data.values, 'deployments', c, chartType);
      }
      return barH(data.labels, data.values, 'deployments', c, isHorizontalBar(modal, true));
    },
  },
  {
    id: 'host-platform',
    title: 'Host system',
    group: 'deployments',
    section: 'how-it-runs',
    description: 'NAS or server platform when we can tell (Unraid, TrueNAS, Synology, …).',
    isAvailable: (win) => win.panels.host_platform != null,
    modal: { chartTypes: COLUMNAR_MODAL_TYPES, zoom: true },
    build: (_d, win, _s, c, modal) => {
      const data = formatHostPlatformBreakdown(win.panels.host_platform!);
      if (!modal) return doughnut(data, 'deployments', c);
      const chartType = modalChartType(modal, COLUMNAR_MODAL_TYPES) ?? 'doughnut';
      if (chartType === 'doughnut' || chartType === 'pie') {
        return circularBreakdown(data.labels, data.values, 'deployments', c, chartType);
      }
      return barH(data.labels, data.values, 'deployments', c, isHorizontalBar(modal, true));
    },
  },
  rangePanel('cpu-cores', 'CPU cores', 'Cores on the machine running FileBrowser.', 'system', 'cpu_cores', 'how-it-runs'),
  rangePanel(
    'memory-rss',
    'FileBrowser memory',
    'Memory used by the FileBrowser process.',
    'system',
    'memory_rss_mb',
    'how-it-runs',
  ),
  rangePanel('memory-total', 'Host memory', 'Total RAM on the machine.', 'system', 'memory_total_mb', 'how-it-runs'),
  {
    id: 'version-trains',
    title: 'Version lines over time',
    group: 'versions',
    section: 'versions',
    description: 'Share of installations on each minor line (e.g. v2.0.x stable, v2.1.x beta).',
    isAvailable: (win) => (win.panels.version_trains_ts?.labels.length ?? 0) > 0,
    modal: { chartTypes: COMPOSITION_MODAL_TYPES, zoom: true },
    build: (_d, win, state, c, modal) => {
      const source = win.panels.version_trains_ts!;
      let labels = source.labels;
      let series = source.series;
      if (state.versionFilter !== 'all' && source.keys) {
        const filtered = filterVersionSeries(source.keys, series, state.versionFilter);
        labels = filtered.labels.map((_, i) => {
          const idx = source.keys!.indexOf(filtered.labels[i]);
          return idx >= 0 ? source.labels[idx] : filtered.labels[i];
        });
        series = filtered.series;
      }
      if (!modal) {
        return stackedComposition(bucketLabels(win), labels, normalizeSeriesToPercent(series), 'versions', c, 'area');
      }
      return buildCompositionChart(bucketLabels(win), labels, series, 'versions', c, modal, false);
    },
  },
  {
    id: 'versions',
    title: 'Versions over time',
    group: 'versions',
    section: 'versions',
    description: 'Share of installations on each exact release.',
    modal: { chartTypes: COMPOSITION_MODAL_TYPES, zoom: true },
    build: (_d, win, state, c, modal) => {
      const { labels, series } = filterVersionSeries(
        win.panels.versions.labels,
        win.panels.versions.series,
        state.versionFilter,
      );
      if (!modal) {
        const pct = normalizeSeriesToPercent(series);
        return stackedComposition(bucketLabels(win), labels, pct, 'versions', c, 'area');
      }
      return buildCompositionChart(bucketLabels(win), labels, series, 'versions', c, modal, false);
    },
  },
  compositionTimeseriesPanel(
    'version-channel-share',
    'Stable vs beta',
    'Share of installations on stable vs beta.',
    'versions',
    [
      { key: 'stable_share_pct', label: 'Stable' },
      { key: 'beta_share_pct', label: 'Beta' },
    ],
    'versions',
    { alreadyPercent: true },
  ),
  {
    id: 'features',
    title: 'Features',
    group: 'features',
    section: 'features',
    description: 'Optional settings such as TLS, activity log, and previews.',
    modal: { chartTypes: FLAG_MODAL_TYPES, zoom: true },
    build: (_d, win, _s, c, modal) => buildFlagChart(win.panels.features, 'features', c, modal),
  },
  {
    id: 'integrations',
    title: 'Integrations',
    group: 'integrations',
    section: 'features',
    description: 'Media, OnlyOffice, and hardware acceleration.',
    modal: { chartTypes: FLAG_MODAL_TYPES, zoom: true },
    build: (_d, win, _s, c, modal) => buildFlagChart(win.panels.integrations, 'integrations', c, modal),
  },
  rangePanel(
    'custom-themes',
    'Custom themes',
    'How many custom themes an installation defines.',
    'counts',
    'custom_themes',
    'features',
  ),
  {
    id: 'auth',
    title: 'Authentication methods',
    group: 'auth',
    section: 'users-sharing',
    description: 'How installations sign people in.',
    modal: { chartTypes: FLAG_MODAL_TYPES, zoom: true },
    build: (_d, win, _s, c, modal) => buildFlagChart(win.panels.auth, 'auth', c, modal),
  },
  rangePanel(
    'users-total',
    'Users',
    'How many user accounts installations have.',
    'counts',
    'users_total',
    'users-sharing',
  ),
  timeseriesPanel(
    'avg-users',
    'Typical users over time',
    'Typical (median) user accounts per installation.',
    'counts',
    'avg_users',
    'Users',
    'users-sharing',
    { integerTicks: true },
  ),
  rangePanel(
    'shares-active',
    'Shares',
    'How many active shares installations have.',
    'counts',
    'shares_active',
    'users-sharing',
  ),
  timeseriesPanel(
    'avg-shares',
    'Typical shares over time',
    'Typical (median) active shares per installation.',
    'counts',
    'avg_shares',
    'Shares',
    'users-sharing',
    { integerTicks: true },
  ),
  rangePanel(
    'access-rules-total',
    'Access rules',
    'How many path access rules installations have.',
    'counts',
    'access_rules_total',
    'users-sharing',
  ),
  timeseriesPanel(
    'avg-access-rules',
    'Typical access rules over time',
    'Typical (median) access rules per installation.',
    'counts',
    'avg_access_rules',
    'Access rules',
    'users-sharing',
    { integerTicks: true },
  ),
  rangePanel(
    'sources-enabled',
    'Total Sources',
    'How many storage sources each installation has.',
    'counts',
    'sources_enabled',
    'sources',
  ),
  groupedRangePanel(
    'sources-features-enabled',
    'Source features enabled',
    'Writable, share-enabled, and indexed source counts per installation. Each range bucket shows three bars side by side.',
    'counts',
    'sources_writable',
    [
      { label: 'Writable', rangeKey: 'sources_writable' },
      { label: 'Share enabled', rangeKey: 'sources_public' },
      { label: 'Indexed', rangeKey: 'sources_indexed' },
    ],
    'sources',
    {
      optionalRangeKeys: ['sources_writable', 'sources_public'],
    },
  ),
  groupedRangePanel(
    'sources-features-disabled',
    'Source features disabled',
    'Read-only, private, and non-indexed source counts per installation. Each range bucket shows three bars side by side.',
    'counts',
    'sources_read_only',
    [
      { label: 'Read-only', rangeKey: 'sources_read_only' },
      { label: 'Private', rangeKey: 'sources_private' },
      { label: 'Indexing disabled', rangeKey: 'sources_without_index' },
    ],
    'sources',
    {
      optionalRangeKeys: ['sources_without_index'],
    },
  ),
  multiTimeseriesPanel(
    'library-size-over-time',
    'Typical library size over time',
    'Typical (median) indexed files and folders per installation.',
    'indexing',
    [
      { key: 'avg_total_files', label: 'Files' },
      { key: 'avg_total_dirs', label: 'Folders' },
    ],
    'sources',
    { integerTicks: true },
  ),
  groupedRangePanel(
    'library-size',
    'Library size',
    'Indexed files and folders per installation. Each size bucket shows two bars side by side (files use the bucket scale on the axis).',
    'storage',
    'total_files',
    [
      { label: 'Files', rangeKey: 'total_files' },
      { label: 'Folders', rangeKey: 'total_dirs' },
    ],
    'sources',
  ),
  multiTimeseriesPanel(
    'scan-time-over-time',
    'Scan time over time',
    'Typical quick (incremental) and full library rescan duration.',
    'indexing',
    [
      { key: 'avg_quick_scan_seconds', label: 'Quick scan' },
      { key: 'avg_full_scan_seconds', label: 'Full scan' },
    ],
    'sources',
  ),
  rangePanel(
    'scan-cost-per-10k',
    'Time per 10,000 files',
    'How long a full rescan takes per 10,000 files.',
    'indexing',
    'scan_cost_per_10k',
    'sources',
  ),
  groupedRangePanel(
    'database-storage-size',
    'Database size',
    'Main database and search index size per installation. Each size bucket shows two bars side by side (main DB uses the bucket scale on the axis).',
    'storage',
    'main_db_bytes',
    [
      { label: 'Main database', rangeKey: 'main_db_bytes' },
      { label: 'Search index', rangeKey: 'index_db_bytes' },
    ],
    'sources',
  ),
  multiTimeseriesPanel(
    'database-size-over-time',
    'Database size over time',
    'Typical main database and search index size over the selected range.',
    'storage',
    [
      { key: 'avg_main_db_bytes', label: 'Main database' },
      { key: 'avg_index_db_bytes', label: 'Search index' },
    ],
    'sources',
    { formatter: formatBytes },
  ),
];

export function getPanel(id: string): PanelDef | undefined {
  return PANELS.find((p) => p.id === id);
}
