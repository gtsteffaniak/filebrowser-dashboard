import { ExpandDropdown } from '../components/expandDropdown';
import type { AppState } from '../app/state';
import type { WindowKey } from '../types/dashboard-v1';

const WINDOW_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
] as const;

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
            <p class="brand-sub">Usage dashboard</p>
          </div>
        </div>
        <p class="navbar-meta"></p>
        <div class="navbar-toolbar"></div>
      </div>
    `;

    this.toolbarEl = this.el.querySelector('.navbar-toolbar')!;
    this.metaEl = this.el.querySelector('.navbar-meta')!;

    this.windowDropdown = new ExpandDropdown(
      [...WINDOW_OPTIONS],
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
    const data = state.data;
    if (data) {
      this.metaEl.textContent = `Data through ${data.data_through} · Updated ${new Date(data.generated_at).toLocaleString()}`;
    } else {
      this.metaEl.textContent = '';
    }

    const windowLabel = WINDOW_OPTIONS.find((o) => o.value === state.window)?.label ?? state.window;
    this.windowDropdown.setValue(state.window, windowLabel);

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
