import { ExpandDropdown, closeExpandDropdown } from '../components/expandDropdown';
import type { AppState } from '../app/state';
import type { WindowKey } from '../types/dashboard-v1';
import { windowPrimaryLabel } from '../utils/windowRange';
import { t } from '../i18n';

const WINDOW_KEYS: WindowKey[] = ['7d', '90d', '1y'];

export interface NavbarCallbacks {
  onWindowChange: (w: WindowKey) => void;
  onVersionChange: (v: string) => void;
  onThemeToggle: () => void;
}

export class Navbar {
  readonly el: HTMLElement;
  private toolbarEl: HTMLElement;
  private metaEl: HTMLElement;
  private windowDropdown: ExpandDropdown;
  private versionDropdown: ExpandDropdown;

  constructor(callbacks: NavbarCallbacks) {
    this.el = document.createElement('header');
    this.el.className = 'navbar';
    this.el.innerHTML = `
      <div class="navbar-inner">
        <div class="navbar-brand">
          <img class="brand-mark" src="/logo.svg" alt="FileBrowser logo" width="40" height="40" />
          <div>
            <h1>FileBrowser Quantum Analytics</h1>
          </div>
        </div>
        <p class="navbar-meta"></p>
        <div class="navbar-toolbar"></div>
      </div>
    `;

    this.toolbarEl = this.el.querySelector('.navbar-toolbar')!;
    this.metaEl = this.el.querySelector('.navbar-meta')!;
    this.windowDropdown = new ExpandDropdown(
      WINDOW_KEYS.map((value) => ({ value, label: windowPrimaryLabel(value) })),
      '90d',
      (v) => callbacks.onWindowChange(v as WindowKey),
      { compact: true, ariaLabel: t('Time range') },
    );

    this.versionDropdown = new ExpandDropdown(
      [{ value: 'all', label: t('All') }],
      'all',
      (v) => callbacks.onVersionChange(v),
      { compact: true, ariaLabel: t('Version filter') },
    );

    const themeBtn = document.createElement('button');
    themeBtn.type = 'button';
    themeBtn.className = 'theme-toggle';
    themeBtn.setAttribute('aria-label', t('Toggle theme'));
    themeBtn.textContent = '◐';
    themeBtn.addEventListener('click', () => callbacks.onThemeToggle());

    this.toolbarEl.appendChild(this.windowDropdown.el);
    // TODO: Version filter doesn't work as expected yet. Hidden for now; re-enable (remove the
    // display override) once the version filtering behaves correctly.
    this.versionDropdown.el.style.display = 'none';
    this.toolbarEl.appendChild(this.versionDropdown.el);
    this.toolbarEl.appendChild(themeBtn);
  }

  update(state: AppState): void {
    closeExpandDropdown(this.windowDropdown.el);
    closeExpandDropdown(this.versionDropdown.el);

    this.windowDropdown.el.setAttribute('aria-label', t('Time range'));
    this.versionDropdown.el.setAttribute('aria-label', t('Version filter'));
    this.toolbarEl.querySelector('.theme-toggle')!.setAttribute('aria-label', t('Toggle theme'));

    const data = state.data;
    if (data) {
      this.metaEl.textContent = t('Updated daily · Through {date}', { date: data.data_through });
    } else {
      this.metaEl.textContent = '';
    }

    const windowOptions = WINDOW_KEYS.map((key) => ({
      value: key,
      label: windowPrimaryLabel(key),
    }));
    this.windowDropdown.setOptions(windowOptions, state.window);

    const trains = state.data?.windows[state.window]?.summary.version_trains ?? [];
    const versionOptions = trains.map((t) => ({
      value: t.key,
      label: `${t.label} (${t.count})`,
    }));
    const current =
      versionOptions.some((o) => o.value === state.versionFilter)
        ? state.versionFilter
        : versionOptions[0]?.value ?? 'all';
    this.versionDropdown.setOptions(versionOptions, current);

    const themeBtn = this.toolbarEl.querySelector('.theme-toggle')!;
    themeBtn.textContent = state.theme === 'dark' ? '☀' : '◐';
  }
}
