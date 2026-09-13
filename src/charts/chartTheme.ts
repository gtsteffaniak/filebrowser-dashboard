import type { ChartConfiguration, ChartOptions } from 'chart.js';

/** Single-series accent per panel group (lines, one bar). */
const GROUP_ACCENT: Record<string, string> = {
  overview: '#2563eb',
  deployments: '#2563eb',
  versions: '#7c3aed',
  auth: '#ea580c',
  integrations: '#059669',
  features: '#db2777',
  indexing: '#0891b2',
  storage: '#d97706',
  system: '#4f46e5',
  counts: '#0d9488',
};

/**
 * Distinct hues for multi-item charts (bars, doughnuts, legends).
 * Chosen for separation on light and dark backgrounds; colorblind-friendly pairs avoided adjacency where possible.
 */
const CATEGORICAL_PALETTE = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#ca8a04', // amber
  '#9333ea', // purple
  '#0891b2', // cyan
  '#ea580c', // orange
  '#db2777', // pink
  '#4f46e5', // indigo
  '#0d9488', // teal
  '#b45309', // brown-gold
  '#be185d', // rose
  '#1d4ed8', // deep blue
  '#65a30d', // lime
];

/** Light → dark gradient pair per panel group (histograms, ordered buckets). */
const GROUP_GRADIENT: Record<string, [string, string]> = {
  overview: ['#93c5fd', '#2563eb'],
  deployments: ['#93c5fd', '#2563eb'],
  versions: ['#c4b5fd', '#7c3aed'],
  auth: ['#fdba74', '#ea580c'],
  integrations: ['#6ee7b7', '#059669'],
  features: ['#f9a8d4', '#db2777'],
  indexing: ['#67e8f9', '#0891b2'],
  storage: ['#fcd34d', '#d97706'],
  system: ['#a5b4fc', '#4f46e5'],
  counts: ['#5eead4', '#0d9488'],
};

/** Rotate palette start per group so adjacent panels don't share the same first swatch. */
const GROUP_PALETTE_OFFSET: Record<string, number> = {
  overview: 0,
  deployments: 1,
  versions: 4,
  auth: 2,
  integrations: 5,
  features: 7,
  indexing: 3,
  storage: 6,
  system: 8,
  counts: 9,
};

/** Fixed colors for known categorical / series labels. */
const LABEL_COLORS: Record<string, string> = {
  windows: '#2563eb',
  linux: '#eab308',
  darwin: '#ffffff',
  macos: '#ffffff',
  mac: '#ffffff',
  stable: '#2563eb',
  beta: '#ea580c',
};

function cssVar(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

function lerpColor(from: string, to: string, t: number): string {
  const [r1, g1, b1] = parseHex(from);
  const [r2, g2, b2] = parseHex(to);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** Ordered buckets / histogram bars — gradient between two related hues. */
export function chartGradientColors(group: string, count: number): string[] {
  const [light, dark] = GROUP_GRADIENT[group] ?? GROUP_GRADIENT.overview;
  if (count <= 1) return [dark];
  return Array.from({ length: count }, (_, i) => lerpColor(light, dark, i / (count - 1)));
}

export function chartColors(group: string, count: number): string[] {
  if (count <= 1) {
    return [GROUP_ACCENT[group] ?? GROUP_ACCENT.overview];
  }
  return chartGradientColors(group, count);
}

/** Per-label colors when known (e.g. OS); otherwise categorical palette. */
export function chartColorsForLabels(group: string, labels: string[]): string[] {
  const offset = GROUP_PALETTE_OFFSET[group] ?? 0;
  return labels.map((label, i) => {
    const mapped = LABEL_COLORS[label.toLowerCase()];
    if (mapped) return mapped;
    return CATEGORICAL_PALETTE[(offset + i) % CATEGORICAL_PALETTE.length];
  });
}

/** Visible outline for near-white chart segments on light backgrounds. */
export function segmentBorderColors(colors: string[]): string[] {
  return colors.map((c) => {
    const normalized = c.toLowerCase();
    if (normalized === '#ffffff' || normalized === '#fff') return '#94a3b8';
    return 'transparent';
  });
}

export function baseOptions(compact: boolean): ChartOptions {
  const text = cssVar('--text-primary', '#546e7a');
  const muted = cssVar('--text-muted', '#6c757d');
  const grid = cssVar('--chart-grid', 'rgba(0,0,0,0.1)');

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: !compact,
        position: 'bottom',
        labels: { color: text, boxWidth: 12, padding: 14 },
      },
      tooltip: {
        backgroundColor: cssVar('--surface-secondary', '#333'),
        titleColor: text,
        bodyColor: text,
      },
    },
    scales: {
      x: {
        ticks: { color: muted, maxRotation: compact ? 0 : 45 },
        grid: { color: grid },
      },
      y: {
        ticks: { color: muted },
        grid: { color: grid },
      },
    },
  };
}

export function doughnutOptions(compact: boolean): ChartConfiguration<'doughnut'>['options'] {
  const base = baseOptions(compact);
  return {
    responsive: base.responsive,
    maintainAspectRatio: base.maintainAspectRatio,
    cutout: '58%',
    plugins: {
      ...base.plugins,
      legend: { display: !compact, position: 'right' },
    },
  };
}

export function mergeOptions<T extends ChartConfiguration>(cfg: T, compact: boolean): T {
  return {
    ...cfg,
    options: { ...baseOptions(compact), ...cfg.options },
  };
}

export type ChartFactory = (compact: boolean) => ChartConfiguration;
