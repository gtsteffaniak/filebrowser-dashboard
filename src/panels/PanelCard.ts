import { ChartHost } from '../charts/ChartHost';
import type { PanelDef } from './registry';
import type { AppState } from '../app/state';
import type { DashboardV1, WindowData } from '../types/dashboard-v1';

export class PanelCard {
  readonly el: HTMLElement;
  private host: ChartHost | null = null;

  constructor(
    private def: PanelDef,
    onExpand: (id: string) => void,
  ) {
    this.el = document.createElement('article');
    this.el.className = 'panel-card';
    this.el.dataset.panelId = def.id;
    this.el.innerHTML = `
      <header class="panel-header">
        <div>
          <h3 class="panel-title">${def.title}</h3>
          ${def.description ? `<p class="panel-desc">${def.description}</p>` : ''}
        </div>
        <button type="button" class="panel-expand" title="Expand" aria-label="Expand ${def.title}">⤢</button>
      </header>
      <div class="panel-chart-wrap"><canvas></canvas></div>
    `;
    this.el.querySelector('.panel-expand')!.addEventListener('click', () => onExpand(def.id));
  }

  render(data: DashboardV1, win: WindowData, state: AppState): void {
    const canvas = this.el.querySelector('canvas') as HTMLCanvasElement;
    if (!this.host) this.host = new ChartHost(canvas);
    const cfg = this.def.build(data, win, state, true);
    this.host.render(cfg);
  }

  destroy(): void {
    this.host?.destroy();
    this.host = null;
  }
}
