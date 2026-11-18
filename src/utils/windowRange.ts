import type { WindowData, WindowKey } from '../types/dashboard-v1';
import { getLocaleTag, t } from '../i18n';

const WINDOW_PRIMARY: Record<WindowKey, string> = {
  '7d': 'Last 7 days',
  '90d': 'Last 90 days',
  '1y': 'Last year',
};

function parseDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Short month name in the active language (e.g. "Sep" / "Sept." / "9月"). */
function monthName(monthIndex: number): string {
  return new Intl.DateTimeFormat(getLocaleTag(), { month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2000, monthIndex, 1)),
  );
}

function fmtDay(d: Date, withYear: boolean): string {
  const base = `${monthName(d.getUTCMonth())} ${d.getUTCDate()}`;
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
    return `${monthName(start.getUTCMonth())} ${start.getUTCDate()}–${end.getUTCDate()}, ${end.getUTCFullYear()}`;
  }
  if (sameYear) {
    return `${fmtDay(start, false)}–${fmtDay(end, true)}`;
  }
  return `${fmtDay(start, true)}–${fmtDay(end, true)}`;
}

export function windowOptionLabel(key: WindowKey, win: WindowData): string {
  return `${windowPrimaryLabel(key)} (${formatDateRange(win.start, win.end)})`;
}

export function windowPrimaryLabel(key: WindowKey): string {
  return t(WINDOW_PRIMARY[key]);
}
