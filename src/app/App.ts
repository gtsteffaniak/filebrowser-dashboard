import { loadDashboard } from '../data/loadDashboard';
import { Navbar } from '../layout/Navbar';
import { PanelCard } from '../panels/PanelCard';
import { PanelModal } from '../panels/Modal';
import { PANELS, type PanelDef } from '../panels/registry';
import { SECTION_ORDER, SECTION_TITLES, type DashboardSection } from '../panels/sections';
import type { WindowKey } from '../types/dashboard-v1';
import { createInitialState, type AppState } from './state';
import { initTheme, toggleTheme } from '../theme/theme';
import { filterVersionSeries, mostCommonVersion } from '../utils/versions';
import { formatInteger } from '../utils/format';
import { el } from '../utils/dom';
import { getLocaleTag, t } from '../i18n';

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
    this.root.innerHTML = `<div class="loading">${t('Loading analytics…')}</div>`;

    this.navbar = new Navbar({
      onWindowChange: (w) => this.setWindow(w),
      onVersionChange: (v) => {
        this.state.versionFilter = v;
        this.renderSummary();
        this.renderPanels();
      },
      onThemeToggle: () => {
        this.state.theme = toggleTheme(this.state.theme);
        this.navbar.update(this.state);
        this.renderPanels();
        this.reopenModal();
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
      const message = err instanceof Error ? err.message : t('Failed to load dashboard');
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

  /** Re-open the expanded panel (if any) so its title, labels and chart pick up the current state. */
  private reopenModal(): void {
    if (!this.state.expandedPanelId || !this.state.data) return;
    const win = this.state.data.windows[this.state.window];
    this.modal.open(this.state.expandedPanelId, this.state.data, win, this.state);
  }

  private render(): void {
    const data = this.state.data;
    if (!data) return;

    this.navbar.update(this.state);

    this.renderSummary();
    this.renderPanels();
  }

  private renderSummary(): void {
    const data = this.state.data;
    if (!data) return;
    const win = data.windows[this.state.window];
    const filter = this.state.versionFilter;
    const filtered = filter !== 'all';

    let installations = win.summary.unique_installations;
    let topVersion: string | undefined = win.summary.most_common_version;
    if (filtered) {
      const train = win.summary.version_trains.find((vt) => vt.key === filter);
      if (train) installations = train.count;
      const v = filterVersionSeries(win.panels.versions.labels, win.panels.versions.series, filter);
      topVersion = mostCommonVersion(v.labels, v.series);
    } else {
      topVersion ??= mostCommonVersion(win.panels.versions.labels, win.panels.versions.series);
    }

    // Average (mean) users per installation, rounded to a whole number for display.
    const avgUsers = win.panels.counts.users_total?.avg;
    // Latest datapoint of the beta share timeseries (percentage of installations on beta).
    const betaSeries = win.panels.timeseries.beta_share_pct ?? [];
    const betaPct = betaSeries.length ? betaSeries[betaSeries.length - 1] : undefined;

    this.summaryEl.textContent = '';
    this.summaryEl.append(
      statCard(t('Installations'), installations.toLocaleString(getLocaleTag())),
      statCard(t('Most used version'), topVersion ?? '', 'stat-version'),
      statCard(t('Average users'), avgUsers != null ? formatInteger(Math.round(avgUsers)) : '—'),
      statCard(t('Using beta'), betaPct != null ? `${betaPct.toFixed(1)}%` : '—'),
    );
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

  private toggleSection(sectionEl: HTMLElement, toggleBtn: HTMLElement, section: DashboardSection): void {
    const collapsed = sectionEl.classList.toggle('is-collapsed');
    toggleBtn.setAttribute('aria-expanded', String(!collapsed));
    if (collapsed) {
      this.state.collapsedSections.add(section);
    } else {
      this.state.collapsedSections.delete(section);
    }
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
      const collapsed = this.state.collapsedSections.has(section);
      if (collapsed) sectionEl.classList.add('is-collapsed');

      const header = document.createElement('div');
      header.className = 'dashboard-section-header';
      header.innerHTML = `
        <button type="button" class="dashboard-section-toggle" aria-expanded="${!collapsed}" aria-label="${t('Toggle {section} section', { section: t(SECTION_TITLES[section]) })}">
          <i class="material-icons dashboard-section-chevron" aria-hidden="true">expand_more</i>
        </button>
        <h2 class="dashboard-section-title">${t(SECTION_TITLES[section])}</h2>
      `;
      const toggleBtn = header.querySelector('.dashboard-section-toggle')!;
      toggleBtn.addEventListener('click', () => this.toggleSection(sectionEl, toggleBtn as HTMLElement, section));
      sectionEl.appendChild(header);

      const sectionBody = document.createElement('div');
      sectionBody.className = 'dashboard-section-body';
      const sectionBodyInner = document.createElement('div');
      sectionBodyInner.className = 'dashboard-section-body-inner';
      sectionBody.appendChild(sectionBodyInner);

      const grid = document.createElement('div');
      grid.className = 'panel-grid';
      for (const def of available) {
        this.addCard(def);
        grid.appendChild(this.cards[this.cards.length - 1].el);
      }
      sectionBodyInner.appendChild(grid);
      sectionEl.appendChild(sectionBody);

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
