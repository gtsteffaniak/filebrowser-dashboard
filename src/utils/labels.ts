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
