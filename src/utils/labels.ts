import type { ColumnarBreakdown } from '../types/dashboard-v1';

/** User-facing OS name (Go reports `darwin` for macOS). */
export function formatOsLabel(value: string): string {
  if (value.toLowerCase() === 'darwin') return 'macOS';
  return value;
}

export function formatOsBreakdown(data: ColumnarBreakdown): ColumnarBreakdown {
  return {
    labels: data.labels.map(formatOsLabel),
    values: data.values,
  };
}

const regionNames =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

/** Full country name for an ISO-3166 alpha-2 code; falls back to the raw label. */
export function formatCountryLabel(value: string): string {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return value;
  try {
    return regionNames?.of(code) ?? value;
  } catch {
    return value;
  }
}

export function formatCountryBreakdown(data: ColumnarBreakdown): ColumnarBreakdown {
  return {
    labels: data.labels.map(formatCountryLabel),
    values: data.values,
  };
}

const HOST_PLATFORM_LABELS: Record<string, string> = {
  unknown: 'Unknown',
  'generic-linux': 'Generic Linux',
  unraid: 'Unraid',
  truenas: 'TrueNAS',
  synology: 'Synology',
  proxmox: 'Proxmox',
  windows: 'Windows',
  macos: 'macOS',
};

export function formatHostPlatformLabel(value: string): string {
  const key = value.toLowerCase().trim();
  return HOST_PLATFORM_LABELS[key] ?? value;
}

export function formatHostPlatformBreakdown(data: ColumnarBreakdown): ColumnarBreakdown {
  return {
    labels: data.labels.map(formatHostPlatformLabel),
    values: data.values,
  };
}
