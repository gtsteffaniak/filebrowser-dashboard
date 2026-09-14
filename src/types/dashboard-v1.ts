export type WindowKey = '7d' | '90d' | '1y';
export type PanelGroup =
  | 'overview'
  | 'deployments'
  | 'versions'
  | 'auth'
  | 'integrations'
  | 'features'
  | 'indexing'
  | 'storage'
  | 'system'
  | 'counts';

export interface VersionTrain {
  key: string;
  label: string;
  count: number;
}

export interface TimeBucket {
  key: string;
  label: string;
  start: string;
  end: string;
}

export interface RangeBucket {
  label: string;
  min?: number;
  max?: number;
}

export interface RangeDefinition {
  unit: string;
  buckets: RangeBucket[];
}

export interface ColumnarBreakdown {
  labels: string[];
  values: number[];
}

export interface FlagBreakdown {
  labels: string[];
  values: number[];
  enabled_pct: number[];
}

export interface CountStat {
  avg: number;
  p50: number;
  p90: number;
}

export interface WindowPanels {
  countries: ColumnarBreakdown;
  os: ColumnarBreakdown;
  arch: ColumnarBreakdown;
  /** Omitted in newer dashboard JSON (runtime panel removed). */
  runtime?: ColumnarBreakdown;
  /** Present once snapshots include `system.host_platform` (omitted in older dashboard JSON). */
  host_platform?: ColumnarBreakdown;
  auth: FlagBreakdown;
  integrations: FlagBreakdown;
  features: FlagBreakdown;
  versions: {
    labels: string[];
    series: number[][]; // [versionIndex][bucketIndex]
  };
  /** Minor-line rollup (v2.0.x stable); omitted in older dashboard JSON. */
  version_trains_ts?: {
    labels: string[];
    keys?: string[];
    series: number[][];
  };
  timeseries: {
    active_installations: number[];
    avg_total_files: number[];
    avg_total_dirs: number[];
    avg_quick_scan_seconds: number[];
    avg_full_scan_seconds: number[];
    avg_users: number[];
    avg_shares: number[];
    avg_access_rules: number[];
    avg_sources_indexed?: number[];
    avg_main_db_bytes: number[];
    avg_index_db_bytes: number[];
    stable_share_pct: number[];
    beta_share_pct: number[];
  };
  ranges: Record<string, number[]>;
  counts: Record<string, CountStat>;
}

export interface WindowData {
  start: string;
  end: string;
  bucket_granularity: 'day' | 'week' | 'month';
  bucket_count: number;
  buckets: TimeBucket[];
  summary: {
    unique_installations: number;
    total_snapshots: number;
    most_common_version?: string;
    version_trains: VersionTrain[];
  };
  panels: WindowPanels;
}

export interface DashboardV1 {
  schema_version: 'dashboard-v1';
  generated_at: string;
  data_through: string;
  app: string;
  range_definitions: Record<string, RangeDefinition>;
  windows: Record<WindowKey, WindowData>;
}

export interface DashboardConfig {
  dataUrl: string;
}
