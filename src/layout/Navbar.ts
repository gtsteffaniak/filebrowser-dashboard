import { ExpandDropdown, closeExpandDropdown } from '../components/expandDropdown';
import type { AppState } from '../app/state';
import type { WindowKey } from '../types/dashboard-v1';
import { windowPrimaryLabel } from '../utils/windowRange';

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
          <span class="brand-mark">FB</span>
          <div>
            <h1>FileBrowser Analytics</h1>
            <p class="brand-sub">How FileBrowser is used</p>
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
      { compact: true, ariaLabel: 'Time range' },
    );

    this.versionDropdown = new ExpandDropdown(
      [{ value: 'all', label: 'All' }],
      'all',
      (v) => callbacks.onVersionChange(v),
      { compact: true, ariaLabel: 'Version filter' },
    );

    const themeBtn = document.createElement('button');
    themeBtn.type = 'button';
    themeBtn.className = 'theme-toggle';
    themeBtn.setAttribute('aria-label', 'Toggle theme');
    themeBtn.textContent = '◐';
    themeBtn.addEventListener('click', () => callbacks.onThemeToggle());

    this.toolbarEl.appendChild(this.windowDropdown.el);
    this.toolbarEl.appendChild(this.versionDropdown.el);
    this.toolbarEl.appendChild(themeBtn);
  }

  update(state: AppState): void {
    closeExpandDropdown(this.windowDropdown.el);
    closeExpandDropdown(this.versionDropdown.el);

    const data = state.data;
    if (data) {
      this.metaEl.textContent = `Updated weekly · Through ${data.data_through}`;
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
