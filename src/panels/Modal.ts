import type { Chart } from 'chart.js';
import { resetZoom } from 'chartjs-plugin-zoom';
import { closeExpandDropdown, ExpandDropdown } from '../components/expandDropdown';
import { ChartHost } from '../charts/ChartHost';
import type { AppState } from '../app/state';
import type { DashboardV1, WindowData } from '../types/dashboard-v1';
import { getPanel } from './registry';
import {
  CHART_TYPE_LABELS,
  DEFAULT_MODAL_OPTS,
  supportsZoom,
  type ModalBuildOptions,
  type ModalChartType,
} from './modalTypes';

export class PanelModal {
  readonly el: HTMLElement;
  private host: ChartHost | null = null;
  private modalEl: HTMLElement;
  private controlsEl: HTMLElement;
  private context: { data: DashboardV1; win: WindowData; state: AppState } | null = null;
  private modalOpts: ModalBuildOptions = { ...DEFAULT_MODAL_OPTS };
  private resetZoomWrap: HTMLElement | null = null;
  private chartTypeDropdown: ExpandDropdown | null = null;
  private currentPanelId: string | null = null;
  private closing = false;
  private onCloseCallback: () => void;

  constructor(onClose: () => void) {
    this.onCloseCallback = onClose;
    this.el = document.createElement('div');
    this.el.className = 'modal-backdrop';
    this.el.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <header class="modal-header">
          <div class="modal-header-text">
            <h2 class="modal-title"></h2>
          </div>
          <button type="button" class="modal-close" aria-label="Close">×</button>
        </header>
        <div class="modal-controls"></div>
        <div class="modal-chart-wrap"><canvas></canvas></div>
      </div>
    `;
    this.modalEl = this.el.querySelector('.modal')!;
    this.controlsEl = this.el.querySelector('.modal-controls')!;

    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });
    this.el.querySelector('.modal-close')!.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.el.classList.contains('is-open')) this.close();
    });
  }

  open(panelId: string, data: DashboardV1, win: WindowData, state: AppState): void {
    const def = getPanel(panelId);
    if (!def) return;

    this.context = { data, win, state };
    this.currentPanelId = panelId;
    this.modalOpts = {
      chartType: def.modal?.chartTypes?.[0],
    };

    const headerText = this.el.querySelector('.modal-header-text')!;
    headerText.querySelector('.modal-title')!.textContent = def.title;
    const descEl = headerText.querySelector('.modal-desc');
    if (def.description) {
      if (!descEl) {
        const p = document.createElement('p');
        p.className = 'modal-desc';
        headerText.appendChild(p);
      }
      headerText.querySelector('.modal-desc')!.textContent = def.description;
    } else {
      descEl?.remove();
    }
    this.renderControls(def);
    this.renderChart(def);

    this.el.classList.remove('hidden');
    requestAnimationFrame(() => {
      this.el.classList.add('is-open');
      this.modalEl.classList.add('is-open');
    });
    document.body.classList.add('modal-open');
  }

  close(): void {
    if (!this.el.classList.contains('is-open') || this.closing) return;
    this.closing = true;
    this.el.classList.remove('is-open');
    this.modalEl.classList.remove('is-open');

    const finish = () => {
      this.el.classList.add('hidden');
      document.body.classList.remove('modal-open');
      this.host?.destroy();
      this.host = null;
      this.context = null;
      this.currentPanelId = null;
      this.resetZoomWrap = null;
      if (this.chartTypeDropdown) {
        closeExpandDropdown(this.chartTypeDropdown.el);
        this.chartTypeDropdown = null;
      }
      this.closing = false;
      this.onCloseCallback();
    };

    this.modalEl.addEventListener('transitionend', () => finish(), { once: true });
    window.setTimeout(finish, 320);
  }

  private renderControls(def: ReturnType<typeof getPanel>): void {
    if (!def) return;
    if (this.chartTypeDropdown) {
      closeExpandDropdown(this.chartTypeDropdown.el);
      this.chartTypeDropdown = null;
    }
    this.controlsEl.innerHTML = '';

    const cfg = def.modal;
    const chartType = this.modalOpts.chartType ?? cfg?.chartTypes?.[0];
    const hasChartTypeControl = cfg?.chartTypes && cfg.chartTypes.length > 1;
    const hasZoom = cfg?.zoom && supportsZoom(chartType);

    if (!cfg || (!hasChartTypeControl && !hasZoom)) {
      this.controlsEl.classList.add('hidden');
      this.resetZoomWrap = null;
      return;
    }

    this.controlsEl.classList.remove('hidden');
    const row = document.createElement('div');
    row.className = 'modal-controls-row';

    if (hasChartTypeControl && cfg.chartTypes) {
      const options = cfg.chartTypes.map((value) => ({
        value,
        label: CHART_TYPE_LABELS[value] ?? value,
      }));
      this.chartTypeDropdown = new ExpandDropdown(
        options,
        chartType ?? cfg.chartTypes[0],
        (v) => {
          this.modalOpts.chartType = v as ModalChartType;
          this.renderChart(def);
          this.renderControls(def);
        },
        { compact: true, ariaLabel: 'Chart type' },
      );
      row.appendChild(wrapControl('Chart type', this.chartTypeDropdown.el));
    }

    this.resetZoomWrap = null;
    if (hasZoom) {
      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'modal-control-btn';
      resetBtn.textContent = 'Reset zoom';
      resetBtn.addEventListener('click', () => {
        const chart = this.host?.getChart();
        if (chart) {
          resetZoom(chart);
          this.syncControlsVisibility();
        }
      });
      this.resetZoomWrap = wrapControl('View', resetBtn);
      this.resetZoomWrap.classList.add('hidden');
      row.appendChild(this.resetZoomWrap);
    }

    this.controlsEl.appendChild(row);
    this.syncControlsVisibility();
  }

  private syncControlsVisibility(): void {
    const def = this.currentPanelId ? getPanel(this.currentPanelId) : undefined;
    const chartType = this.modalOpts.chartType ?? def?.modal?.chartTypes?.[0];
    const hasChartTypeControl = def?.modal?.chartTypes && def.modal.chartTypes.length > 1;
    const zoomEnabled = def?.modal?.zoom === true && supportsZoom(chartType);
    const chart = this.host?.getChart() as (Chart & { isZoomedOrPanned?: () => boolean }) | null;
    const zoomed = Boolean(chart && zoomEnabled && chart.isZoomedOrPanned?.());

    if (this.resetZoomWrap) {
      this.resetZoomWrap.classList.toggle('hidden', !zoomed);
    }

    const showBar = Boolean(hasChartTypeControl || zoomed);
    this.controlsEl.classList.toggle('hidden', !showBar);
  }

  private renderChart(def: ReturnType<typeof getPanel>): void {
    if (!def || !this.context) return;
    const { data, win, state } = this.context;
    const canvas = this.el.querySelector('canvas') as HTMLCanvasElement;
    if (!this.host) this.host = new ChartHost(canvas);

    const chartType = this.modalOpts.chartType ?? def.modal?.chartTypes?.[0];
    const cfg = def.build(data, win, state, false, this.modalOpts);
    const hasMultipleDatasets = (cfg.data.datasets?.length ?? 0) > 1;
    const isDoughnut = cfg.type === 'doughnut' || cfg.type === 'pie';
    const showLegend = hasMultipleDatasets || isDoughnut;
    const zoomEnabled = def.modal?.zoom === true && supportsZoom(chartType);

    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();

    cfg.options = {
      ...cfg.options,
      plugins: {
        ...cfg.options?.plugins,
        legend: {
          display: showLegend,
          position: isDoughnut ? 'right' : 'bottom',
          labels: { color: textColor, boxWidth: 12, padding: 14 },
          onClick: (_e, item, legend) => {
            if (item.datasetIndex === undefined) return;
            const chart = legend.chart;
            const idx = item.datasetIndex;
            const meta = chart.getDatasetMeta(idx);
            meta.hidden = meta.hidden === null ? !chart.data.datasets[idx].hidden : !meta.hidden;
            chart.update();
          },
        },
        ...(zoomEnabled
          ? {
              zoom: {
                pan: {
                  enabled: true,
                  mode: 'xy',
                  onPanComplete: () => this.syncControlsVisibility(),
                },
                zoom: {
                  wheel: { enabled: true },
                  pinch: { enabled: true },
                  mode: 'xy',
                  onZoomComplete: () => this.syncControlsVisibility(),
                },
                limits: {
                  x: { min: 'original', max: 'original' },
                  y: { min: 'original', max: 'original' },
                },
              },
            }
          : {}),
      },
    };

    this.host.render(cfg);
    this.syncControlsVisibility();
  }
}

function wrapControl(label: string, control: HTMLElement): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'modal-control';
  const lbl = document.createElement('label');
  lbl.textContent = label;
  wrap.appendChild(lbl);
  wrap.appendChild(control);
  return wrap;
}
