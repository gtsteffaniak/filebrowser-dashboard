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
import { formatCountryBreakdown, formatHostPlatformBreakdown, formatOsBreakdown } from '../utils/labels';
import { flagSpec } from '../utils/flags';
import { formatBytes } from '../utils/format';
import { filterVersionSeries, omitEmptyTimeBuckets, resolveVersionTrainsTs } from '../utils/versions';
import { t } from '../i18n';

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

const SOURCE_FEATURES = [
  { label: 'Writable', key: 'sources_writable' },
  { label: 'Share enabled', key: 'sources_public' },
  { label: 'Indexed', key: 'sources_indexed' },
] as const;

type GroupedRangeSeries = { label: string; rangeKey: string };

function buildGroupedRangeChart(
  bucketLabels: string[],
  series: GroupedRangeSeries[],
  win: WindowData,
  group: PanelGroup,
  compact: boolean,
  modal?: ModalBuildOptions,
): ChartConfiguration {
  const seriesLabels = series.map((s) => t(s.label));
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

function timeseriesPanel(
  id: string,
  title: string,
  description: string,
  group: PanelGroup,
  valueKey: keyof WindowData['panels']['timeseries'],
  datasetLabel: string,
  section: DashboardSection,
  extra?: { formatter?: ValueFormatter; integerTicks?: boolean; skipZeros?: boolean },
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
      const dataset = t(datasetLabel);
      if (!modal) {
        return lineSingle(
          labels,
          values,
          dataset,
          group,
          c,
          true,
          extra?.formatter,
          extra?.integerTicks,
          extra?.skipZeros,
        );
      }
      const chartType = modalChartType(modal, TIMESERIES_MODAL_TYPES) ?? 'line';
      if (chartType === 'line' || chartType === 'area' || chartType === 'bar' || chartType === 'bar-h') {
        return buildTimeseriesChart(
          labels,
          values,
          dataset,
          group,
          c,
          chartType,
          extra?.formatter,
          extra?.integerTicks,
          extra?.skipZeros,
        );
      }
      return lineSingle(
        labels,
        values,
        dataset,
        group,
        c,
        true,
        extra?.formatter,
        extra?.integerTicks,
        extra?.skipZeros,
      );
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
  opts: { alreadyPercent?: boolean; skipEmptyBuckets?: boolean } = {},
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
      const seriesLabels = seriesKeys.map((s) => t(s.label));
      const raw = seriesKeys.map((s) => (ts[s.key] as number[] | undefined) ?? []);
      const buckets = opts.skipEmptyBuckets
        ? omitEmptyTimeBuckets(labels, raw)
        : { bucketLabels: labels, series: raw };
      return buildCompositionChart(buckets.bucketLabels, seriesLabels, buckets.series, group, c, modal, alreadyPercent);
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
      const dataset = t('Installations');
      if (!modal) return lineSingle(labels, values, dataset, 'overview', c, true, undefined, true);
      const chartType = modalChartType(modal, TIMESERIES_MODAL_TYPES) ?? 'line';
      if (chartType === 'line' || chartType === 'area' || chartType === 'bar' || chartType === 'bar-h') {
        return buildTimeseriesChart(labels, values, dataset, 'overview', c, chartType, undefined, true);
      }
      return lineSingle(labels, values, dataset, 'overview', c, true, undefined, true);
    },
  },
  {
    id: 'countries',
    title: 'Country',
    group: 'deployments',
    section: 'how-it-runs',
    description: 'Where installations connect from.',
    modal: { chartTypes: COLUMNAR_MODAL_TYPES, zoom: true },
    build: (_d, win, _s, c, modal) => {
      const raw = win.panels.countries;
      const data = c ? raw : formatCountryBreakdown(raw);
      const flags = raw.labels.map((code) => flagSpec(code));
      const chartType = modalChartType(modal, COLUMNAR_MODAL_TYPES) ?? 'bar-h';
      if (chartType === 'doughnut' || chartType === 'pie') {
        return circularBreakdown(
          data.labels,
          data.values,
          'deployments',
          c,
          chartType,
          false,
          flags.map((f) => f?.a),
        );
      }
      return barH(data.labels, data.values, 'deployments', c, isHorizontalBar(modal, true), false, flags);
    },
  },
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
    'Application memory',
    'Memory used by the FileBrowser process.',
    'system',
    'memory_rss_mb',
    'how-it-runs',
  ),
  rangePanel('memory-total', 'Host memory', 'Total RAM on the machine.', 'system', 'memory_total_mb', 'how-it-runs'),
  {
    id: 'version-trains',
    title: 'Major versions over time',
    group: 'versions',
    section: 'versions',
    description: 'Share of installations on each minor line (e.g. v2.0.x stable, v2.1.x beta).',
    isAvailable: (win) => (resolveVersionTrainsTs(win)?.labels.length ?? 0) > 0,
    modal: { chartTypes: COMPOSITION_MODAL_TYPES, zoom: true },
    build: (_d, win, state, c, modal) => {
      const source = resolveVersionTrainsTs(win)!;
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
      const buckets = omitEmptyTimeBuckets(bucketLabels(win), series);
      if (!modal) {
        return stackedComposition(
          buckets.bucketLabels,
          labels,
          normalizeSeriesToPercent(buckets.series),
          'versions',
          c,
          'area',
        );
      }
      return buildCompositionChart(buckets.bucketLabels, labels, buckets.series, 'versions', c, modal, false);
    },
  },
  {
    id: 'versions',
    title: 'Minor versions over time',
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
      const buckets = omitEmptyTimeBuckets(bucketLabels(win), series);
      if (!modal) {
        const pct = normalizeSeriesToPercent(buckets.series);
        return stackedComposition(buckets.bucketLabels, labels, pct, 'versions', c, 'area');
      }
      return buildCompositionChart(buckets.bucketLabels, labels, buckets.series, 'versions', c, modal, false);
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
    { alreadyPercent: true, skipEmptyBuckets: true },
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
    'Users over time',
    'Typical (median) user accounts per installation.',
    'counts',
    'avg_users',
    'Users',
    'users-sharing',
    { integerTicks: true, skipZeros: true },
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
    'Shares over time',
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
    'Access rules over time',
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
  {
    id: 'source-features',
    title: 'Source features',
    group: 'counts',
    section: 'sources',
    description: 'Installations with at least one writable, share-enabled, or indexed source.',
    isAvailable: (win) => SOURCE_FEATURES.some((p) => Array.isArray(win.panels.ranges[p.key])),
    modal: { chartTypes: FLAG_MODAL_TYPES, zoom: true },
    build: (d, win, _s, c, modal) => {
      const data: FlagBreakdown = { labels: [], values: [], enabled_pct: [] };
      for (const p of SOURCE_FEATURES) {
        const hist = win.panels.ranges[p.key];
        if (!Array.isArray(hist)) continue;
        const total = hist.reduce((a, b) => a + b, 0);
        if (total <= 0) continue;
        const buckets = d.range_definitions[p.key]?.buckets ?? [];
        const zeroIdx = Math.max(
          0,
          buckets.findIndex((b) => (b.min ?? 0) === 0 && (b.max ?? 0) === 0),
        );
        const enabled = total - (hist[zeroIdx] ?? 0);
        data.labels.push(t(p.label));
        data.values.push(enabled);
        data.enabled_pct.push(enabled / total);
      }
      return buildFlagChart(data, 'counts', c, modal);
    },
  },
  timeseriesPanel(
    'files-over-time',
    'Typical indexed files over time',
    'Typical (median) indexed files per installation.',
    'indexing',
    'avg_total_files',
    'Files',
    'sources',
    { integerTicks: true, skipZeros: true },
  ),
  timeseriesPanel(
    'folders-over-time',
    'Typical indexed folders over time',
    'Typical (median) indexed folders per installation.',
    'indexing',
    'avg_total_dirs',
    'Folders',
    'sources',
    { integerTicks: true, skipZeros: true },
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
  timeseriesPanel(
    'quick-scan-time-over-time',
    'Quick scan time over time',
    'Typical (median) quick (incremental) library rescan duration.',
    'indexing',
    'avg_quick_scan_seconds',
    'Quick scan (s)',
    'sources',
    { skipZeros: true },
  ),
  timeseriesPanel(
    'full-scan-time-over-time',
    'Full scan time over time',
    'Typical (median) full library rescan duration.',
    'indexing',
    'avg_full_scan_seconds',
    'Full scan (s)',
    'sources',
    { skipZeros: true },
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
  timeseriesPanel(
    'main-db-size-over-time',
    'Main database size over time',
    'Typical (median) main database size over the selected range.',
    'storage',
    'avg_main_db_bytes',
    'Main database',
    'sources',
    { formatter: formatBytes, skipZeros: true },
  ),
  timeseriesPanel(
    'search-index-size-over-time',
    'Search index size over time',
    'Typical (median) search index size over the selected range.',
    'storage',
    'avg_index_db_bytes',
    'Search index',
    'sources',
    { formatter: formatBytes, skipZeros: true },
  ),
];

export function getPanel(id: string): PanelDef | undefined {
  return PANELS.find((p) => p.id === id);
}
