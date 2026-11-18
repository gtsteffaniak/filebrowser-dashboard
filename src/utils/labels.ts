import type { ColumnarBreakdown } from '../types/dashboard-v1';
import { getLocaleTag, t } from '../i18n';

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

const regionNamesByTag = new Map<string, Intl.DisplayNames>();

function regionNames(tag: string): Intl.DisplayNames | null {
  if (typeof Intl === 'undefined' || !('DisplayNames' in Intl)) return null;
  let names = regionNamesByTag.get(tag);
  if (!names) {
    names = new Intl.DisplayNames([tag], { type: 'region' });
    regionNamesByTag.set(tag, names);
  }
  return names;
}

/** Full country name in the active language for an ISO-3166 alpha-2 code; falls back to the raw label. */
export function formatCountryLabel(value: string): string {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return value;
  try {
    return regionNames(getLocaleTag())?.of(code) ?? value;
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

// Brand names are not translated; only generic labels go through t().
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
  const label = HOST_PLATFORM_LABELS[key];
  if (!label) return value;
  return t(label);
}

export function formatHostPlatformBreakdown(data: ColumnarBreakdown): ColumnarBreakdown {
  return {
    labels: data.labels.map(formatHostPlatformLabel),
    values: data.values,
  };
}
