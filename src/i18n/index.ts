import en from './locales/en.json';
import { locales } from './locales';

/**
 * Lightweight i18n for the dashboard (no framework).
 *
 * English source text is used as the message key, e.g. `t('Time range')`.
 * Placeholders use `{name}` syntax: `t('Updated {date}', { date })`.
 * Missing translations fall back to English, then to the key itself.
 */

type Messages = Record<string, string>;

const DEFAULT_LOCALE = 'en';

const source: Messages = en;
const messages: Record<string, Messages> = { en: source };

// English is bundled; every other locale is a lazy chunk loaded on demand.
const localeModules = import.meta.glob<{ default: Messages }>(
  ['./locales/*.json', '!./locales/en.json'],
);

let current = DEFAULT_LOCALE;

/** Translate a message key, optionally filling `{placeholders}`. */
export function t(key: string, params?: Record<string, string | number>): string {
  const msg = messages[current]?.[key] ?? source[key] ?? key;
  if (!params) return msg;
  return msg.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Currently active locale id (key of `locales`). */
export function getLocale(): string {
  return current;
}

/** BCP 47 tag of the active locale, for Intl APIs and `<html lang>`. */
export function getLocaleTag(): string {
  return locales[current]?.tag ?? 'en';
}

// Languages written right-to-left
export const rtlLanguages = ['he', 'ar'];

export function isSupportedLocale(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(locales, id);
}

/** Use the system/browser language (no manual override), else English. */
export function detectLocale(): string {
  const browser = navigator.language.toLowerCase();
  const prefix = browser.split('-')[0] ?? '';
  const byTag = (tag: string) => Object.keys(locales).find((id) => locales[id].tag === tag);
  return (
    byTag(browser) ??
    byTag(prefix) ??
    // e.g. 'zh' -> zhCN: the first regional variant
    Object.keys(locales).find((id) => locales[id].tag.startsWith(`${prefix}-`)) ??
    DEFAULT_LOCALE
  );
}

/** Switch the UI language, loading its catalog first if needed. */
export async function setLocale(id: string): Promise<void> {
  const target = isSupportedLocale(id) ? id : DEFAULT_LOCALE;
  const file = locales[target].file;

  if (!messages[target]) {
    const load = localeModules[`./locales/${file}.json`];
    if (load) {
      try {
        messages[target] = (await load()).default;
      } catch (err) {
        console.error(`Failed to load locale "${target}":`, err);
      }
    }
  }

  current = messages[target] ? target : DEFAULT_LOCALE;
  document.documentElement.setAttribute('lang', getLocaleTag());
  document.documentElement.setAttribute('dir', rtlLanguages.includes(current) ? 'rtl' : 'ltr');
}

/** Call once at startup, before the first render. */
export function initI18n(): Promise<void> {
  return setLocale(detectLocale());
}
