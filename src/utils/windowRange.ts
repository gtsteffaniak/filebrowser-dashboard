import type { WindowData, WindowKey } from '../types/dashboard-v1';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const WINDOW_PRIMARY: Record<WindowKey, string> = {
  '7d': 'Last 7 days',
  '90d': 'Last 90 days',
  '1y': 'Last year',
};

function parseDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fmtDay(d: Date, withYear: boolean): string {
  const mon = MONTHS[d.getUTCMonth()];
  const day = d.getUTCDate();
  const base = `${mon} ${day}`;
  return withYear ? `${base}, ${d.getUTCFullYear()}` : base;
}

/** Inclusive UTC date range, e.g. `Sep 6–12, 2026` or `Jun 13, 2026–Sep 12, 2026`. */
export function formatDateRange(startIso: string, endIso: string): string {
  const start = parseDay(startIso);
  const end = parseDay(endIso);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();
  if (startIso === endIso) return fmtDay(end, true);
  if (sameMonth) {
    return `${MONTHS[start.getUTCMonth()]} ${start.getUTCDate()}–${end.getUTCDate()}, ${end.getUTCFullYear()}`;
  }
  if (sameYear) {
    return `${fmtDay(start, false)}–${fmtDay(end, true)}`;
  }
  return `${fmtDay(start, true)}–${fmtDay(end, true)}`;
}

export function windowOptionLabel(key: WindowKey, win: WindowData): string {
  return `${WINDOW_PRIMARY[key]} (${formatDateRange(win.start, win.end)})`;
}

export function windowPrimaryLabel(key: WindowKey): string {
  return WINDOW_PRIMARY[key];
}
