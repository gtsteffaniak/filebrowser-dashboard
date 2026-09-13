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
} from '../charts/builders';
import type { FlagBreakdown } from '../types/dashboard-v1';
import type { ModalBuildOptions, ModalChartType, ModalControlsConfig } from './modalTypes';
import {
  COLUMNAR_MODAL_TYPES,
  COMPOSITION_MODAL_TYPES,
  FLAG_MODAL_TYPES,
  RANGE_MODAL_TYPES,
  TIMESERIES_MODAL_TYPES,
  isHorizontalBar,
} from './modalTypes';
import { formatHostPlatformBreakdown, formatOsBreakdown } from '../utils/labels';
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
  description?: string;
  /** When false, the panel is omitted (e.g. optional fields in older dashboard JSON). */
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

function rangePanel(
  id: string,
  title: string,
  description: string,
  group: PanelGroup,
  rangeKey: string,
): PanelDef {
  return {
    id,
    title,
    description,
    group,
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
): PanelDef {
  return {
    id,
    title,
    description,
    group,
    modal: { chartTypes: TIMESERIES_MODAL_TYPES, zoom: true },
    build: (_d, win, _s, c, modal) => {
      const labels = bucketLabels(win);
      const values = win.panels.timeseries[valueKey] ?? [];
      if (!modal) return lineSingle(labels, values, datasetLabel, group, c, true);
      const chartType = modalChartType(modal, TIMESERIES_MODAL_TYPES) ?? 'line';
      if (chartType === 'line' || chartType === 'area' || chartType === 'bar' || chartType === 'bar-h') {
        return buildTimeseriesChart(labels, values, datasetLabel, group, c, chartType);
      }
      return lineSingle(labels, values, datasetLabel, group, c, true);
    },
  };
}

function compositionTimeseriesPanel(
  id: string,
  title: string,
  description: string,
  group: PanelGroup,
  seriesKeys: Array<{ key: keyof WindowData['panels']['timeseries']; label: string }>,
  opts: { alreadyPercent?: boolean } = {},
): PanelDef {
  const alreadyPercent = opts.alreadyPercent ?? true;
  return {
    id,
    title,
    description,
    group,
    modal: { chartTypes: COMPOSITION_MODAL_TYPES, zoom: true },
    build: (_d, win, _s, c, modal) => {
      const labels = bucketLabels(win);
      const ts = win.panels.timeseries;
      const seriesLabels = seriesKeys.map((s) => s.label);
      const raw = seriesKeys.map((s) => ts[s.key] ?? []);
      return buildCompositionChart(labels, seriesLabels, raw, group, c, modal, alreadyPercent);
    },
  };
}

export const PANELS: PanelDef[] = [
  {
    id: 'active-installations',
    title: 'Reporting installations',
    group: 'overview',
    description: 'How many unique deployments sent a snapshot in each time bucket.',
    modal: { chartTypes: TIMESERIES_MODAL_TYPES, zoom: true },
    build: (_d, win, _s, c, modal) => {
      const labels = bucketLabels(win);
      const values = win.panels.timeseries.active_installations;
      if (!modal) return lineSingle(labels, values, 'Installations', 'overview', c, true);
      const chartType = modalChartType(modal, TIMESERIES_MODAL_TYPES) ?? 'line';
      if (chartType === 'line' || chartType === 'area' || chartType === 'bar' || chartType === 'bar-h') {
        return buildTimeseriesChart(labels, values, 'Installations', 'overview', c, chartType);
      }
      return lineSingle(labels, values, 'Installations', 'overview', c, true);
    },
  },
  columnarPanel(
    'countries',
    'Where instances run',
    'Geographic spread of deployments, based on client country at snapshot time.',
    'deployments',
    (w) => w.panels.countries,
    { defaultHorizontal: true, zoom: true },
  ),
  {
    id: 'os',
    title: 'Host operating system',
    group: 'deployments',
    description: 'Linux, Windows, macOS, and other platforms in the fleet.',
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
    description: 'amd64 vs arm64 and other architectures across the fleet.',
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
    title: 'Host platform',
    group: 'deployments',
    description:
      'Underlying NAS or server OS when detectable (Unraid, TrueNAS, Synology, Proxmox, etc.). Older snapshots report as unknown.',
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
  {
    id: 'versions',
    title: 'Release adoption over time',
    group: 'versions',
    description:
      'Share of the fleet on each release over the window. Stable and beta builds are separate (e.g. v2.0.0-stable vs v2.0.0-beta).',
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
  {
    id: 'auth',
    title: 'Sign-in methods in use',
    group: 'auth',
    description: 'Share of deployments with each authentication option enabled.',
    modal: { chartTypes: FLAG_MODAL_TYPES, zoom: true },
    build: (_d, win, _s, c, modal) => buildFlagChart(win.panels.auth, 'auth', c, modal),
  },
  {
    id: 'integrations',
    title: 'Third-party integrations',
    group: 'integrations',
    description: 'Media streaming, OnlyOffice, and hardware acceleration uptake.',
    modal: { chartTypes: FLAG_MODAL_TYPES, zoom: true },
    build: (_d, win, _s, c, modal) => buildFlagChart(win.panels.integrations, 'integrations', c, modal),
  },
  {
    id: 'features',
    title: 'Optional product features',
    group: 'features',
    description: 'TLS, activity logging, preview settings, and other toggles across deployments.',
    modal: { chartTypes: FLAG_MODAL_TYPES, zoom: true },
    build: (_d, win, _s, c, modal) => buildFlagChart(win.panels.features, 'features', c, modal),
  },
  timeseriesPanel(
    'avg-files',
    'Indexed file volume',
    'Typical number of files per deployment over the selected window.',
    'indexing',
    'avg_total_files',
    'Files',
  ),
  timeseriesPanel(
    'avg-dirs',
    'Indexed folder volume',
    'Typical directory count per deployment as libraries grow or shrink.',
    'indexing',
    'avg_total_dirs',
    'Folders',
  ),
  timeseriesPanel(
    'quick-scan',
    'Quick scan duration',
    'How long incremental index scans take on average, in seconds.',
    'indexing',
    'avg_quick_scan_seconds',
    'Quick scan (s)',
  ),
  timeseriesPanel(
    'full-scan',
    'Full scan duration',
    'How long full library rescans take on average, in seconds.',
    'indexing',
    'avg_full_scan_seconds',
    'Full scan (s)',
  ),
  rangePanel(
    'cpu-cores',
    'Host CPU capacity',
    'Number of cores on machines running FileBrowser.',
    'system',
    'cpu_cores',
  ),
  rangePanel(
    'memory-rss',
    'Process memory footprint',
    'RSS memory used by the FileBrowser process, in megabytes.',
    'system',
    'memory_rss_mb',
  ),
  rangePanel(
    'memory-total',
    'Available system memory',
    'Total RAM on the host, in megabytes.',
    'system',
    'memory_total_mb',
  ),
  rangePanel(
    'main-db',
    'Main database size',
    'On-disk size of the primary FileBrowser database.',
    'storage',
    'main_db_bytes',
  ),
  rangePanel(
    'index-db',
    'Search index size',
    'On-disk size of the file search index database.',
    'storage',
    'index_db_bytes',
  ),
  rangePanel(
    'total-files-range',
    'Library size (files)',
    'How many files deployments are managing, grouped by scale.',
    'storage',
    'total_files',
  ),
  rangePanel(
    'total-dirs-range',
    'Library size (folders)',
    'How many directories deployments are managing, grouped by scale.',
    'storage',
    'total_dirs',
  ),
  rangePanel(
    'sources-enabled',
    'Configured storage sources',
    'How many file sources each deployment has connected.',
    'counts',
    'sources_enabled',
  ),
  rangePanel(
    'sources-indexed',
    'Indexed storage sources',
    'How many connected sources have a search index built.',
    'indexing',
    'sources_indexed',
  ),
  timeseriesPanel(
    'avg-sources-indexed',
    'Indexed sources per deployment',
    'Average number of sources with a built search index over time.',
    'indexing',
    'avg_sources_indexed',
    'Indexed sources',
  ),
  rangePanel(
    'users-total',
    'User accounts per deployment',
    'Distribution of local user account counts across the fleet.',
    'counts',
    'users_total',
  ),
  timeseriesPanel(
    'avg-users',
    'Users per deployment',
    'Average number of user accounts per deployment over time.',
    'counts',
    'avg_users',
    'Users',
  ),
  rangePanel(
    'shares-active',
    'Active shares per deployment',
    'How many file shares each deployment currently has active.',
    'counts',
    'shares_active',
  ),
  timeseriesPanel(
    'avg-shares',
    'Shares per deployment',
    'Average number of active shares per deployment over time.',
    'counts',
    'avg_shares',
    'Shares',
  ),
  rangePanel(
    'access-rules-total',
    'Access rules per deployment',
    'How many path-level access rules deployments have configured.',
    'counts',
    'access_rules_total',
  ),
  timeseriesPanel(
    'avg-access-rules',
    'Access rules per deployment',
    'Average number of access rules per deployment over time.',
    'counts',
    'avg_access_rules',
    'Access rules',
  ),
  rangePanel(
    'sources-read-only',
    'Read-only sources',
    'How many connected sources are mounted read-only.',
    'counts',
    'sources_read_only',
  ),
  rangePanel(
    'sources-private',
    'Private sources',
    'How many connected sources are marked private.',
    'counts',
    'sources_private',
  ),
  rangePanel(
    'custom-themes',
    'Custom themes',
    'How many custom UI themes each deployment has defined.',
    'counts',
    'custom_themes',
  ),
  timeseriesPanel(
    'avg-main-db',
    'Main database size trend',
    'Average on-disk size of the primary FileBrowser database over time.',
    'storage',
    'avg_main_db_bytes',
    'Main DB (bytes)',
  ),
  timeseriesPanel(
    'avg-index-db',
    'Search index size trend',
    'Average on-disk size of the file search index over time.',
    'storage',
    'avg_index_db_bytes',
    'Index DB (bytes)',
  ),
  rangePanel(
    'memory-pressure',
    'Memory pressure',
    'FileBrowser process memory as a percentage of total host RAM.',
    'system',
    'memory_pressure_pct',
  ),
  rangePanel(
    'scan-cost-per-10k',
    'Full scan cost per 10k files',
    'How long a full library rescan takes per 10,000 indexed files.',
    'indexing',
    'scan_cost_per_10k',
  ),
  compositionTimeseriesPanel(
    'version-channel-share',
    'Stable vs beta share',
    'Share of reporting installations on stable versus beta releases over time.',
    'versions',
    [
      { key: 'stable_share_pct', label: 'Stable' },
      { key: 'beta_share_pct', label: 'Beta' },
    ],
    { alreadyPercent: true },
  ),
];

export function getPanel(id: string): PanelDef | undefined {
  return PANELS.find((p) => p.id === id);
}
