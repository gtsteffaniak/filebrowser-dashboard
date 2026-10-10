import { loadDashboard } from '../data/loadDashboard';
import { Navbar } from '../layout/Navbar';
import { PanelCard } from '../panels/PanelCard';
import { PanelModal } from '../panels/Modal';
import { PANELS, type PanelDef } from '../panels/registry';
import { SECTION_ORDER, SECTION_TITLES } from '../panels/sections';
import type { WindowKey } from '../types/dashboard-v1';
import { createInitialState, type AppState } from './state';
import { initTheme, toggleTheme } from '../theme/theme';
import { mostCommonVersion } from '../utils/versions';
import { el } from '../utils/dom';

export class App {
  private state: AppState;
  private root: HTMLElement;
  private navbar: Navbar;
  private modal: PanelModal;
  private summaryEl: HTMLElement;
  private bodyEl: HTMLElement;
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

    this.bodyEl = document.createElement('div');
    this.bodyEl.className = 'dashboard-body';
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
      const message = err instanceof Error ? err.message : 'Failed to load dashboard';
      this.root.textContent = '';
      this.root.appendChild(el('div', 'error', message));
    }
  }

  private mount(): void {
    this.root.innerHTML = '';
    this.root.classList.add('dashboard-shell');
    this.root.appendChild(this.navbar.el);
    this.root.appendChild(this.summaryEl);
    this.root.appendChild(this.bodyEl);
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

    this.summaryEl.textContent = '';
    this.summaryEl.append(
      statCard('Installations', win.summary.unique_installations.toLocaleString()),
      statCard('Most used version', topVersion ?? '', 'stat-version'),
    );

    this.renderPanels();
  }

  private addCard(def: PanelDef): void {
    const data = this.state.data;
    if (!data) return;
    const win = data.windows[this.state.window];
    if (def.isAvailable && !def.isAvailable(win)) return;
    const card = new PanelCard(def, (id) => {
      this.state.expandedPanelId = id;
      this.modal.open(id, data, win, this.state);
    });
    card.render(data, win, this.state);
    this.cards.push(card);
  }

  private renderPanels(): void {
    const data = this.state.data;
    if (!data) return;

    this.cards.forEach((c) => c.destroy());
    this.cards = [];
    this.bodyEl.innerHTML = '';

    const hero = PANELS.find((p) => p.hero);
    if (hero) {
      const heroGrid = document.createElement('div');
      heroGrid.className = 'panel-grid panel-grid--lead';
      this.addCard(hero);
      const card = this.cards[this.cards.length - 1];
      if (card) {
        card.el.classList.add('panel-card--hero');
        heroGrid.appendChild(card.el);
        this.bodyEl.appendChild(heroGrid);
      }
    }

    for (const section of SECTION_ORDER) {
      const sectionPanels = PANELS.filter((p) => !p.hero && p.section === section);
      const available = sectionPanels.filter((p) => {
        const win = data.windows[this.state.window];
        return !p.isAvailable || p.isAvailable(win);
      });
      if (!available.length) continue;

      const sectionEl = document.createElement('section');
      sectionEl.className = 'dashboard-section';
      const header = document.createElement('div');
      header.className = 'dashboard-section-header';
      header.innerHTML = `<h2 class="dashboard-section-title">${SECTION_TITLES[section]}</h2>`;
      sectionEl.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'panel-grid';
      for (const def of available) {
        this.addCard(def);
        grid.appendChild(this.cards[this.cards.length - 1].el);
      }
      sectionEl.appendChild(grid);

      this.bodyEl.appendChild(sectionEl);
    }
  }
}

function statCard(label: string, value: string, valueClass = ''): HTMLElement {
  const card = el('div', 'stat-card');
  card.append(
    el('span', 'stat-label', label),
    el('span', `stat-value${valueClass ? ` ${valueClass}` : ''}`, value),
  );
  return card;
}
