#!/usr/bin/env node
/**
 * Generates fixtures/dashboard.sample.json and public/dashboard.json
 */
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');

const DATA_THROUGH = '2026-09-11';

const RANGE_DEFINITIONS = {
  "memory_rss_mb": {
    "unit": "MB",
    "buckets": [
      {
        "label": "<128 MB",
        "max": 128
      },
      {
        "label": "128–512 MB",
        "min": 128,
        "max": 512
      },
      {
        "label": "512 MB–1 GB",
        "min": 513,
        "max": 1024
      },
      {
        "label": "1–4 GB",
        "min": 1025,
        "max": 4096
      },
      {
        "label": ">4 GB",
        "min": 4097
      }
    ]
  },
  "memory_total_mb": {
    "unit": "MB",
    "buckets": [
      {
        "label": "<4 GB",
        "max": 4096
      },
      {
        "label": "4–16 GB",
        "min": 4096,
        "max": 16384
      },
      {
        "label": "16–32 GB",
        "min": 16385,
        "max": 32768
      },
      {
        "label": "32–64 GB",
        "min": 32769,
        "max": 65536
      },
      {
        "label": ">64 GB",
        "min": 65537
      }
    ]
  },
  "cpu_cores": {
    "unit": "cores",
    "buckets": [
      {
        "label": "1–2",
        "min": 1,
        "max": 2
      },
      {
        "label": "3–4",
        "min": 3,
        "max": 4
      },
      {
        "label": "5–8",
        "min": 5,
        "max": 8
      },
      {
        "label": "9–16",
        "min": 9,
        "max": 16
      },
      {
        "label": ">16",
        "min": 17
      }
    ]
  },
  "total_files": {
    "unit": "files",
    "buckets": [
      {
        "label": "<10k",
        "max": 10000
      },
      {
        "label": "10k–100k",
        "min": 10000,
        "max": 100000
      },
      {
        "label": "100k–500k",
        "min": 100001,
        "max": 500000
      },
      {
        "label": "500k–1M",
        "min": 500001,
        "max": 1000000
      },
      {
        "label": ">1M",
        "min": 1000001
      }
    ]
  },
  "total_dirs": {
    "unit": "dirs",
    "buckets": [
      {
        "label": "<1k",
        "max": 1000
      },
      {
        "label": "1k–10k",
        "min": 1000,
        "max": 10000
      },
      {
        "label": "10k–50k",
        "min": 10001,
        "max": 50000
      },
      {
        "label": "50k–100k",
        "min": 50001,
        "max": 100000
      },
      {
        "label": ">100k",
        "min": 100001
      }
    ]
  },
  "main_db_bytes": {
    "unit": "bytes",
    "buckets": [
      {
        "label": "<10 MB",
        "max": 10485760
      },
      {
        "label": "10–100 MB",
        "min": 10485760,
        "max": 104857600
      },
      {
        "label": "100 MB–500 MB",
        "min": 104857601,
        "max": 524288000
      },
      {
        "label": "500 MB–1 GB",
        "min": 524288001,
        "max": 1073741824
      },
      {
        "label": ">1 GB",
        "min": 1073741825
      }
    ]
  },
  "index_db_bytes": {
    "unit": "bytes",
    "buckets": [
      {
        "label": "<100 MB",
        "max": 104857600
      },
      {
        "label": "100 MB–1 GB",
        "min": 104857600,
        "max": 1073741824
      },
      {
        "label": "1–5 GB",
        "min": 1073741825,
        "max": 5368709120
      },
      {
        "label": "5–10 GB",
        "min": 5368709121,
        "max": 10737418240
      },
      {
        "label": ">10 GB",
        "min": 10737418241
      }
    ]
  },
  "sources_enabled": {
    "unit": "sources",
    "buckets": [
      {
        "label": "1",
        "min": 1,
        "max": 1
      },
      {
        "label": "2",
        "min": 2,
        "max": 2
      },
      {
        "label": "3–4",
        "min": 3,
        "max": 4
      },
      {
        "label": "5–8",
        "min": 5,
        "max": 8
      },
      {
        "label": ">8",
        "min": 9
      }
    ]
  },
  "users_total": {
    "unit": "users",
    "buckets": [
      {
        "label": "1",
        "min": 1,
        "max": 1
      },
      {
        "label": "2–5",
        "min": 2,
        "max": 5
      },
      {
        "label": "6–20",
        "min": 6,
        "max": 20
      },
      {
        "label": "21–100",
        "min": 21,
        "max": 100
      },
      {
        "label": ">100",
        "min": 101
      }
    ]
  },
  "shares_active": {
    "unit": "shares",
    "buckets": [
      {
        "label": "0",
        "min": 0,
        "max": 0
      },
      {
        "label": "1",
        "min": 1,
        "max": 1
      },
      {
        "label": "2–3",
        "min": 2,
        "max": 3
      },
      {
        "label": "4–10",
        "min": 4,
        "max": 10
      },
      {
        "label": ">10",
        "min": 11
      }
    ]
  },
  "access_rules_total": {
    "unit": "rules",
    "buckets": [
      {
        "label": "0",
        "min": 0,
        "max": 0
      },
      {
        "label": "1–10",
        "min": 1,
        "max": 10
      },
      {
        "label": "11–25",
        "min": 11,
        "max": 25
      },
      {
        "label": "26–50",
        "min": 26,
        "max": 50
      },
      {
        "label": ">50",
        "min": 51
      }
    ]
  },
  "sources_read_only": {
    "unit": "sources",
    "buckets": [
      {
        "label": "0",
        "min": 0,
        "max": 0
      },
      {
        "label": "1",
        "min": 1,
        "max": 1
      },
      {
        "label": "2",
        "min": 2,
        "max": 2
      },
      {
        "label": "3–5",
        "min": 3,
        "max": 5
      },
      {
        "label": ">5",
        "min": 6
      }
    ]
  },
  "sources_private": {
    "unit": "sources",
    "buckets": [
      {
        "label": "0",
        "min": 0,
        "max": 0
      },
      {
        "label": "1",
        "min": 1,
        "max": 1
      },
      {
        "label": "2",
        "min": 2,
        "max": 2
      },
      {
        "label": "3–5",
        "min": 3,
        "max": 5
      },
      {
        "label": ">5",
        "min": 6
      }
    ]
  },
  "custom_themes": {
    "unit": "themes",
    "buckets": [
      {
        "label": "0",
        "min": 0,
        "max": 0
      },
      {
        "label": "1",
        "min": 1,
        "max": 1
      },
      {
        "label": "2–3",
        "min": 2,
        "max": 3
      },
      {
        "label": "4–8",
        "min": 4,
        "max": 8
      },
      {
        "label": ">8",
        "min": 9
      }
    ]
  },
  "sources_indexed": {
    "unit": "sources",
    "buckets": [
      {
        "label": "0",
        "min": 0,
        "max": 0
      },
      {
        "label": "1",
        "min": 1,
        "max": 1
      },
      {
        "label": "2–3",
        "min": 2,
        "max": 3
      },
      {
        "label": "4–5",
        "min": 4,
        "max": 5
      },
      {
        "label": ">5",
        "min": 6
      }
    ]
  },
  "scan_cost_per_10k": {
    "unit": "seconds",
    "buckets": [
      {
        "label": "<1 s",
        "max": 1
      },
      {
        "label": "1–5 s",
        "min": 1,
        "max": 5
      },
      {
        "label": "5–15 s",
        "min": 5,
        "max": 15
      },
      {
        "label": "15–30 s",
        "min": 15,
        "max": 30
      },
      {
        "label": ">30 s",
        "min": 30
      }
    ]
  },
  "sources_writable": {
    "unit": "sources",
    "buckets": [
      {
        "label": "0",
        "min": 0,
        "max": 0
      },
      {
        "label": "1",
        "min": 1,
        "max": 1
      },
      {
        "label": "2",
        "min": 2,
        "max": 2
      },
      {
        "label": "3–5",
        "min": 3,
        "max": 5
      },
      {
        "label": ">5",
        "min": 6
      }
    ]
  },
  "sources_public": {
    "unit": "sources",
    "buckets": [
      {
        "label": "0",
        "min": 0,
        "max": 0
      },
      {
        "label": "1",
        "min": 1,
        "max": 1
      },
      {
        "label": "2",
        "min": 2,
        "max": 2
      },
      {
        "label": "3–5",
        "min": 3,
        "max": 5
      },
      {
        "label": ">5",
        "min": 6
      }
    ]
  },
  "sources_without_index": {
    "unit": "sources",
    "buckets": [
      {
        "label": "0",
        "min": 0,
        "max": 0
      },
      {
        "label": "1",
        "min": 1,
        "max": 1
      },
      {
        "label": "2",
        "min": 2,
        "max": 2
      },
      {
        "label": "3–5",
        "min": 3,
        "max": 5
      },
      {
        "label": ">5",
        "min": 6
      }
    ]
  }
};
const WINDOW_META = {
  "7d": {
    "start": "2026-09-05",
    "end": "2026-09-11",
    "bucket_granularity": "day",
    "bucket_count": 7,
    "buckets": [
      {
        "key": "2026-09-05",
        "label": "Sep 5",
        "start": "2026-09-05",
        "end": "2026-09-05"
      },
      {
        "key": "2026-09-06",
        "label": "Sep 6",
        "start": "2026-09-06",
        "end": "2026-09-06"
      },
      {
        "key": "2026-09-07",
        "label": "Sep 7",
        "start": "2026-09-07",
        "end": "2026-09-07"
      },
      {
        "key": "2026-09-08",
        "label": "Sep 8",
        "start": "2026-09-08",
        "end": "2026-09-08"
      },
      {
        "key": "2026-09-09",
        "label": "Sep 9",
        "start": "2026-09-09",
        "end": "2026-09-09"
      },
      {
        "key": "2026-09-10",
        "label": "Sep 10",
        "start": "2026-09-10",
        "end": "2026-09-10"
      },
      {
        "key": "2026-09-11",
        "label": "Sep 11",
        "start": "2026-09-11",
        "end": "2026-09-11"
      }
    ]
  },
  "90d": {
    "start": "2026-06-14",
    "end": "2026-09-11",
    "bucket_granularity": "week",
    "bucket_count": 12,
    "buckets": [
      {
        "key": "2026-06-14",
        "label": "Jun 14\u2013Jun 21",
        "start": "2026-06-14",
        "end": "2026-06-21"
      },
      {
        "key": "2026-06-22",
        "label": "Jun 22\u2013Jun 29",
        "start": "2026-06-22",
        "end": "2026-06-29"
      },
      {
        "key": "2026-06-30",
        "label": "Jun 30\u2013Jul 7",
        "start": "2026-06-30",
        "end": "2026-07-07"
      },
      {
        "key": "2026-07-08",
        "label": "Jul 8\u2013Jul 15",
        "start": "2026-07-08",
        "end": "2026-07-15"
      },
      {
        "key": "2026-07-16",
        "label": "Jul 16\u2013Jul 23",
        "start": "2026-07-16",
        "end": "2026-07-23"
      },
      {
        "key": "2026-07-24",
        "label": "Jul 24\u2013Jul 31",
        "start": "2026-07-24",
        "end": "2026-07-31"
      },
      {
        "key": "2026-08-01",
        "label": "Aug 1\u2013Aug 7",
        "start": "2026-08-01",
        "end": "2026-08-07"
      },
      {
        "key": "2026-08-08",
        "label": "Aug 8\u2013Aug 14",
        "start": "2026-08-08",
        "end": "2026-08-14"
      },
      {
        "key": "2026-08-15",
        "label": "Aug 15\u2013Aug 21",
        "start": "2026-08-15",
        "end": "2026-08-21"
      },
      {
        "key": "2026-08-22",
        "label": "Aug 22\u2013Aug 28",
        "start": "2026-08-22",
        "end": "2026-08-28"
      },
      {
        "key": "2026-08-29",
        "label": "Aug 29\u2013Sep 4",
        "start": "2026-08-29",
        "end": "2026-09-04"
      },
      {
        "key": "2026-09-05",
        "label": "Sep 5\u2013Sep 11",
        "start": "2026-09-05",
        "end": "2026-09-11"
      }
    ]
  },
  "1y": {
    "start": "2025-10-01",
    "end": "2026-09-11",
    "bucket_granularity": "month",
    "bucket_count": 12,
    "buckets": [
      {
        "key": "2025-10",
        "label": "Oct 2025",
        "start": "2025-10-01",
        "end": "2025-10-31"
      },
      {
        "key": "2025-11",
        "label": "Nov 2025",
        "start": "2025-11-01",
        "end": "2025-11-30"
      },
      {
        "key": "2025-12",
        "label": "Dec 2025",
        "start": "2025-12-01",
        "end": "2025-12-31"
      },
      {
        "key": "2026-01",
        "label": "Jan 2026",
        "start": "2026-01-01",
        "end": "2026-01-31"
      },
      {
        "key": "2026-02",
        "label": "Feb 2026",
        "start": "2026-02-01",
        "end": "2026-02-28"
      },
      {
        "key": "2026-03",
        "label": "Mar 2026",
        "start": "2026-03-01",
        "end": "2026-03-31"
      },
      {
        "key": "2026-04",
        "label": "Apr 2026",
        "start": "2026-04-01",
        "end": "2026-04-30"
      },
      {
        "key": "2026-05",
        "label": "May 2026",
        "start": "2026-05-01",
        "end": "2026-05-31"
      },
      {
        "key": "2026-06",
        "label": "Jun 2026",
        "start": "2026-06-01",
        "end": "2026-06-30"
      },
      {
        "key": "2026-07",
        "label": "Jul 2026",
        "start": "2026-07-01",
        "end": "2026-07-31"
      },
      {
        "key": "2026-08",
        "label": "Aug 2026",
        "start": "2026-08-01",
        "end": "2026-08-31"
      },
      {
        "key": "2026-09",
        "label": "Sep 2026",
        "start": "2026-09-01",
        "end": "2026-09-11"
      }
    ]
  }
};

function series(n, base, step = 3) {
  return Array.from({ length: n }, (_, i) => base + i * step);
}

function floatSeries(n, base, step) {
  return Array.from({ length: n }, (_, i) => Math.round((base + i * step) * 10) / 10);
}

/** Stable + beta shares that always sum to 100%. */
function channelShareSeries(n, stableStart, stableStep) {
  const stable = [];
  const beta = [];
  for (let i = 0; i < n; i++) {
    const s = Math.min(98, Math.max(2, Math.round((stableStart + i * stableStep) * 10) / 10));
    stable.push(s);
    beta.push(Math.round((100 - s) * 10) / 10);
  }
  return { stable_share_pct: stable, beta_share_pct: beta };
}

/** Scale integer weights so they sum to target (fleet size). */
function scaleToTotal(weights, target) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  const scaled = weights.map((w) => Math.max(0, Math.round((w / sum) * target)));
  const diff = target - scaled.reduce((a, b) => a + b, 0);
  if (diff !== 0 && scaled.length > 0) scaled[0] += diff;
  return scaled;
}

const VERSION_TRAIN_RE = /^v?(\d+\.\d+)\.\d+-(stable|beta)$/;

function versionTrainKey(version) {
  const m = (version || '').match(VERSION_TRAIN_RE);
  if (!m) return 'other';
  return `v${m[1]}.x-${m[2]}`;
}

function versionTrainLabel(trainKey) {
  if (trainKey === 'other') return 'Other';
  return trainKey.replace('.x-stable', '.x stable').replace('.x-beta', '.x beta');
}

/** Keep the top N patch releases by total installations (matches dashboard builder). */
function topPatchVersions(versions, topN = 10) {
  const totals = versions.labels.map((label, i) => ({
    label,
    i,
    total: versions.series[i].reduce((a, b) => a + b, 0),
  }));
  totals.sort((a, b) => b.total - a.total);
  const picked = totals.slice(0, topN);
  return {
    labels: picked.map((p) => p.label),
    series: picked.map((p) => versions.series[p.i]),
  };
}

/** Roll patch-level series up to minor-line trains (same grouping as dashboard builder). */
function rollupVersionTrainsTs(versions, topN = 12) {
  const bucketCount = versions.series[0]?.length ?? 0;
  const totals = new Map();
  const byTrain = new Map();

  for (let i = 0; i < versions.labels.length; i++) {
    const train = versionTrainKey(versions.labels[i]);
    const row = versions.series[i];
    const sum = row.reduce((a, b) => a + b, 0);
    totals.set(train, (totals.get(train) || 0) + sum);
    if (!byTrain.has(train)) byTrain.set(train, Array(bucketCount).fill(0));
    const bucket = byTrain.get(train);
    for (let b = 0; b < bucketCount; b++) bucket[b] += row[b] || 0;
  }

  const topTrains = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([key]) => key);

  return {
    labels: topTrains.map(versionTrainLabel),
    keys: topTrains,
    series: topTrains.map((key) => byTrain.get(key) ?? []),
  };
}

function versionTrainsSummary(unique, versionTrainsTs) {
  const trains = [{ key: 'all', label: 'All', count: unique }];
  for (let i = 0; i < versionTrainsTs.keys.length; i++) {
    const count = versionTrainsTs.series[i].reduce((a, b) => a + b, 0);
    trains.push({
      key: versionTrainsTs.keys[i],
      label: versionTrainsTs.labels[i],
      count,
    });
  }
  return trains;
}

function mostCommonPatchVersion(versions) {
  if (!versions.labels.length) return '—';
  let best = 0;
  let idx = 0;
  for (let i = 0; i < versions.labels.length; i++) {
    const t = versions.series[i].reduce((a, b) => a + b, 0);
    if (t > best) {
      best = t;
      idx = i;
    }
  }
  return versions.labels[idx];
}

/** Deterministic seed from window bounds (no fixed version strings in source). */
function versionFixtureSeed(meta, scale) {
  let h = 0;
  for (const part of [meta.start, meta.end, meta.bucket_granularity, scale]) {
    const s = String(part);
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Synthetic patch-level time series for local dev only.
 * Labels are built from numeric major/minor/patch/channel — trains are grouped via rollupVersionTrainsTs.
 */
function syntheticPatchVersions(bucketCount, scale, seed) {
  const labels = [];
  const seriesRows = [];
  const lineCount = 4 + (seed % 3);

  for (let li = 0; li < lineCount; li++) {
    const major = 1 + ((seed + li * 7) % 4);
    const minor = (seed + li * 3) % 6;
    const channel = (li + seed) % 5 === 0 ? 'beta' : 'stable';
    const patchCount = 2 + ((seed + li) % 4);
    const lineWeight = Math.round((10 + (lineCount - li) * 5 + (seed % 8)) * scale);
    const lineStep = li < lineCount / 2 ? 2 : -1;

    for (let patch = 0; patch < patchCount; patch++) {
      labels.push(`v${major}.${minor}.${patch}-${channel}`);
      const base = Math.max(1, lineWeight - patch * Math.round(2 * scale));
      const step = lineStep + (patch % 2 === 0 ? 0 : 1);
      seriesRows.push(series(bucketCount, base, step).map((v) => Math.max(0, v)));
    }
  }

  const oddCount = 1 + (seed % 2);
  for (let o = 0; o < oddCount; o++) {
    labels.push(`custom-${((seed + o * 17) % 0xffff).toString(16)}`);
    const base = Math.round((2 + ((seed + o) % 6)) * scale);
    seriesRows.push(series(bucketCount, base, 0).map((v) => Math.max(0, v)));
  }

  return { labels, series: seriesRows };
}

function buildWindow(meta, scale) {
  const bc = meta.buckets.length;
  const unique = Math.round(124 * scale);
  const channelShare = channelShareSeries(bc, 72 + scale, 0.6);
  const versionsRaw = syntheticPatchVersions(bc, scale, versionFixtureSeed(meta, scale));
  const versions = topPatchVersions(versionsRaw, 10);
  const version_trains_ts = rollupVersionTrainsTs(versionsRaw, 12);

  return {
    ...meta,
    summary: {
      unique_installations: unique,
      total_snapshots: Math.round(131 * scale),
      most_common_version: mostCommonPatchVersion(versions),
      version_trains: versionTrainsSummary(unique, version_trains_ts),
    },
    panels: {
      countries: {
        labels: ['US', 'DE', 'GB', 'FR', 'CA', 'NL', 'AU', 'SE', 'JP', 'BR', 'other'],
        values: scaleToTotal([42, 18, 14, 11, 9, 8, 7, 6, 5, 4, 8], unique),
      },
      os: {
        labels: ['linux', 'windows', 'macOS', 'other'],
        values: scaleToTotal([78, 28, 12, 6], unique),
      },
      arch: {
        labels: ['amd64', 'arm64', 'other'],
        values: scaleToTotal([95, 24, 5], unique),
      },
      host_platform: {
        labels: ['unraid', 'truenas', 'generic-linux', 'synology', 'unknown'],
        values: scaleToTotal([34, 22, 28, 12, 28], unique),
      },
      auth: {
        labels: ['Password', 'Password signup', 'OIDC', 'Proxy', 'LDAP', 'JWT', 'Passkey', 'OTP enforced'],
        values: [88, 42, 34, 12, 8, 6, 4, 15].map((v) => Math.round(v * scale)),
        enabled_pct: [0.71, 0.34, 0.27, 0.1, 0.06, 0.05, 0.03, 0.12],
      },
      integrations: {
        labels: ['Media', 'OnlyOffice', 'OnlyOffice view-only', 'HW acceleration'],
        values: [96, 41, 18, 22].map((v) => Math.round(v * scale)),
        enabled_pct: [0.77, 0.33, 0.15, 0.18],
      },
      features: {
        labels: [
          'Activity log',
          'TLS',
          'WebDAV off',
          'Previews off',
          'Update check off',
          'Rate limit off',
          'Index WAL',
          'Cache cleanup',
        ],
        values: [110, 72, 45, 38, 28, 12, 8, 15].map((v) => Math.round(v * scale)),
        enabled_pct: [0.89, 0.58, 0.36, 0.31, 0.23, 0.1, 0.06, 0.12],
      },
      versions,
      version_trains_ts,
      timeseries: {
        active_installations: series(bc, Math.round(98 * scale), Math.round(4 * scale)),
        avg_total_files: series(bc, Math.round(78000 * scale), Math.round(1500 * scale)),
        avg_total_dirs: series(bc, Math.round(8200 * scale), Math.round(120 * scale)),
        avg_quick_scan_seconds: floatSeries(bc, 38, 1.8),
        avg_full_scan_seconds: floatSeries(bc, 280, 7.5),
        avg_users: series(bc, Math.round(8 * scale), 0),
        avg_shares: series(bc, Math.round(3 * scale), 0),
        avg_access_rules: series(bc, Math.round(12 * scale), 0),
        avg_main_db_bytes: series(bc, Math.round(85_000_000 * scale), Math.round(2_500_000 * scale)),
        avg_index_db_bytes: series(bc, Math.round(420_000_000 * scale), Math.round(8_000_000 * scale)),
        ...channelShare,
      },
      ranges: {
        memory_rss_mb: scaleToTotal([8, 42, 58, 14, 2], unique),
        memory_total_mb: scaleToTotal([10, 38, 42, 24, 10], unique),
        cpu_cores: scaleToTotal([22, 45, 38, 15, 4], unique),
        total_files: scaleToTotal([18, 42, 35, 22, 7], unique),
        total_dirs: scaleToTotal([15, 45, 38, 18, 8], unique),
        main_db_bytes: scaleToTotal([28, 42, 32, 18, 4], unique),
        index_db_bytes: scaleToTotal([22, 48, 35, 15, 4], unique),
        sources_enabled: scaleToTotal([38, 42, 28, 12, 4], unique),
        users_total: scaleToTotal([18, 42, 38, 20, 6], unique),
        shares_active: scaleToTotal([22, 38, 35, 22, 7], unique),
        access_rules_total: scaleToTotal([12, 45, 38, 22, 7], unique),
        sources_read_only: scaleToTotal([55, 32, 22, 12, 3], unique),
        sources_private: scaleToTotal([65, 22, 18, 14, 5], unique),
        custom_themes: scaleToTotal([52, 35, 22, 12, 3], unique),
        sources_indexed: scaleToTotal([8, 38, 42, 24, 12], unique),
        sources_writable: scaleToTotal([38, 42, 28, 12, 4], unique),
        sources_public: scaleToTotal([48, 32, 22, 14, 8], unique),
        sources_without_index: scaleToTotal([42, 35, 22, 16, 9], unique),
        scan_cost_per_10k: scaleToTotal([15, 38, 35, 24, 12], unique),
      },
      counts: {
        sources_enabled: { avg: 2.4, p50: 2, p90: 5 },
        sources_read_only: { avg: 0.8, p50: 0, p90: 2 },
        sources_private: { avg: 0.4, p50: 0, p90: 1 },
        users_total: { avg: 8.2, p50: 5, p90: 18 },
        access_rules_total: { avg: 12.4, p50: 8, p90: 28 },
        shares_active: { avg: 3.1, p50: 2, p90: 8 },
        custom_themes: { avg: 1.2, p50: 0, p90: 3 },
        sources_indexed: { avg: 2.1, p50: 2, p90: 4 },
      },
    },
  };
}

const doc = {
  schema_version: 'dashboard-v1',
  generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  data_through: DATA_THROUGH,
  app: 'filebrowser',
  range_definitions: RANGE_DEFINITIONS,
  windows: {
    '7d': buildWindow(WINDOW_META['7d'], 1),
    '90d': buildWindow(WINDOW_META['90d'], 2.5),
    '1y': buildWindow(WINDOW_META['1y'], 4.2),
  },
};

const json = JSON.stringify(doc, null, 2);
writeFileSync(join(root, 'fixtures/dashboard.sample.json'), json);
writeFileSync(join(root, 'public/dashboard.json'), json);
console.log('Wrote fixtures/dashboard.sample.json and public/dashboard.json');
