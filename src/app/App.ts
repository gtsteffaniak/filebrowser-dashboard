import { loadDashboard } from '../data/loadDashboard';
import { Navbar } from '../layout/Navbar';
import { PanelCard } from '../panels/PanelCard';
import { PanelModal } from '../panels/Modal';
import { PANELS } from '../panels/registry';
import type { WindowKey } from '../types/dashboard-v1';
import { createInitialState, type AppState } from './state';
import { initTheme, toggleTheme } from '../theme/theme';
import { mostCommonVersion } from '../utils/versions';

export class App {
  private state: AppState;
  private root: HTMLElement;
  private navbar: Navbar;
  private modal: PanelModal;
  private summaryEl: HTMLElement;
  private gridEl: HTMLElement;
  private cards: PanelCard[] = [];

  constructor(root: HTMLElement, theme = initTheme()) {
    this.state = createInitialState(theme);
    this.root = root;
    this.root.innerHTML = '<div class="loading">Loading analytics…</div>';

    this.navbar = new Navbar({
      onWindowChange: (w) => this.setWindow(w),
      onVersionChange: (v) => {
        this.state.versionFilter = v;
        this.renderPanels();
      },
      onThemeToggle: () => {
        this.state.theme = toggleTheme(this.state.theme);
        this.navbar.update(this.state);
        this.renderPanels();
        if (this.state.expandedPanelId) {
          const win = this.state.data?.windows[this.state.window];
          if (win && this.state.data) {
            this.modal.open(this.state.expandedPanelId, this.state.data, win, this.state);
          }
        }
      },
    });

    this.modal = new PanelModal(() => {
      this.state.expandedPanelId = null;
    });

    this.summaryEl = document.createElement('section');
    this.summaryEl.className = 'summary-row';

    this.gridEl = document.createElement('section');
    this.gridEl.className = 'panel-grid';
  }

  async start(): Promise<void> {
    try {
      const data = await loadDashboard();
      if (data.schema_version !== 'dashboard-v1') {
        throw new Error(`Unsupported schema: ${data.schema_version}`);
      }
      this.state.data = data;
      this.state.loading = false;
      this.mount();
      this.render();
    } catch (err) {
      this.root.innerHTML = `<div class="error">${err instanceof Error ? err.message : 'Failed to load dashboard'}</div>`;
    }
  }

  private mount(): void {
    this.root.innerHTML = '';
    this.root.classList.add('dashboard-shell');
    this.root.appendChild(this.navbar.el);
    this.root.appendChild(this.summaryEl);
    this.root.appendChild(this.gridEl);
    document.body.appendChild(this.modal.el);
  }

  private setWindow(w: WindowKey): void {
    this.state.window = w;
    this.render();
  }

  private render(): void {
    const data = this.state.data;
    if (!data) return;

    const win = data.windows[this.state.window];
    this.navbar.update(this.state);

    const topVersion =
      win.summary.most_common_version ??
      mostCommonVersion(win.panels.versions.labels, win.panels.versions.series);

    this.summaryEl.innerHTML = `
      <div class="stat-card">
        <span class="stat-label">Unique installations</span>
        <span class="stat-value">${win.summary.unique_installations.toLocaleString()}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Total snapshots</span>
        <span class="stat-value">${win.summary.total_snapshots.toLocaleString()}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Most common version</span>
        <span class="stat-value stat-version">${topVersion}</span>
      </div>
    `;

    this.renderPanels();
  }

  private renderPanels(): void {
    const data = this.state.data;
    if (!data) return;
    const win = data.windows[this.state.window];

    this.cards.forEach((c) => c.destroy());
    this.cards = [];
    this.gridEl.innerHTML = '';

    for (const def of PANELS) {
      if (def.isAvailable && !def.isAvailable(win)) continue;
      const card = new PanelCard(def, (id) => {
        this.state.expandedPanelId = id;
        this.modal.open(id, data, win, this.state);
      });
      card.render(data, win, this.state);
      this.cards.push(card);
      this.gridEl.appendChild(card.el);
    }
  }
}
