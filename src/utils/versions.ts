import type { WindowData } from '../types/dashboard-v1';
import { t } from '../i18n';

const VERSION_TRAIN_RE = /^v?[0-9]+\.[0-9]+\.[0-9]+-(stable|beta)$/;
const VERSION_TRAIN_KEY_RE = /^v?(\d+\.\d+)\.\d+-(stable|beta)$/;

export interface VersionTrainsTimeseries {
  labels: string[];
  keys?: string[];
  series: number[][];
}

/** Minor-line train key (e.g. v2.0.x-beta), matching dashboard builder. */
export function versionTrainKey(version: string): string {
  const m = (version || '').match(VERSION_TRAIN_KEY_RE);
  if (!m) return 'other';
  return `v${m[1]}.x-${m[2]}`;
}

export function versionTrainLabel(trainKey: string): string {
  if (trainKey === 'other') return t('Other');
  return trainKey.replace('.x-stable', '.x stable').replace('.x-beta', '.x beta');
}

/** Roll patch-level version timeseries into minor-line trains (builder parity). */
export function rollupVersionTrainsTs(
  versions: { labels: string[]; series: number[][] },
  topN = 12,
): VersionTrainsTimeseries | null {
  if (!versions.labels.length || !versions.series.length) return null;

  const bucketCount = versions.series[0]?.length ?? 0;
  const totals = new Map<string, number>();
  const byTrain = new Map<string, number[]>();

  for (let i = 0; i < versions.labels.length; i++) {
    const train = versionTrainKey(versions.labels[i]);
    const row = versions.series[i];
    const sum = row.reduce((a, b) => a + b, 0);
    totals.set(train, (totals.get(train) ?? 0) + sum);
    if (!byTrain.has(train)) byTrain.set(train, Array(bucketCount).fill(0));
    const bucket = byTrain.get(train)!;
    for (let b = 0; b < bucketCount; b++) bucket[b] += row[b] ?? 0;
  }

  const topTrains = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([key]) => key);

  if (!topTrains.length) return null;

  return {
    labels: topTrains.map(versionTrainLabel),
    keys: topTrains,
    series: topTrains.map((key) => byTrain.get(key) ?? []),
  };
}

/** Prefer builder output; fall back to rollup from patch versions panel. */
export function resolveVersionTrainsTs(win: WindowData): VersionTrainsTimeseries | null {
  const built = win.panels.version_trains_ts;
  if (built?.labels?.length) return built;
  return rollupVersionTrainsTs(win.panels.versions);
}

/** Match a version label against a train key like `v2.0.x-stable` or `all`. */
export function matchesVersionTrain(version: string, trainKey: string): boolean {
  if (trainKey === 'all') return true;
  if (trainKey === 'other') return !VERSION_TRAIN_RE.test(version);

  const channelMatch = trainKey.match(/^(.+)-(stable|beta)$/);
  if (!channelMatch) {
    const prefix = trainKey.replace(/\.x$/, '');
    return version === prefix || version.startsWith(`${prefix}.`);
  }

  const [, prefix, channel] = channelMatch;
  const base = prefix.replace(/\.x$/, '');
  return version.endsWith(`-${channel}`) && version.startsWith(`${base}.`);
}

export function filterVersionSeries(
  labels: string[],
  series: number[][],
  trainKey: string,
): { labels: string[]; series: number[][] } {
  if (trainKey === 'all') return { labels, series };
  const idx = labels
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => matchesVersionTrain(v, trainKey))
    .map(({ i }) => i);
  return {
    labels: idx.map((i) => labels[i]),
    series: idx.map((i) => series[i]),
  };
}

/** Drop time buckets where every series is empty or zero (missing data). */
export function omitEmptyTimeBuckets(
  bucketLabels: string[],
  series: number[][],
): { bucketLabels: string[]; series: number[][] } {
  const keep: number[] = [];
  for (let i = 0; i < bucketLabels.length; i++) {
    let total = 0;
    for (const row of series) {
      const v = row?.[i];
      if (typeof v === 'number' && Number.isFinite(v)) total += v;
    }
    if (total > 0) keep.push(i);
  }
  if (keep.length === bucketLabels.length) return { bucketLabels, series };
  return {
    bucketLabels: keep.map((i) => bucketLabels[i]),
    series: series.map((row) => keep.map((i) => row?.[i] ?? 0)),
  };
}

export function mostCommonVersion(labels: string[], series: number[][]): string {
  if (!labels.length) return '—';
  const totals = labels.map((_, i) => series[i]?.reduce((a, b) => a + b, 0) ?? 0);
  const idx = totals.reduce((best, t, i) => (t > totals[best] ? i : best), 0);
  return labels[idx] ?? '—';
}
