import { Chart, type ChartConfiguration } from 'chart.js';

export class ChartHost {
  private chart: Chart | null = null;
  private observer: ResizeObserver | null = null;
  private alive = true;

  constructor(private canvas: HTMLCanvasElement) {
    this.observer = new ResizeObserver(() => {
      if (!this.alive || !this.chart || !this.canvas.isConnected) return;
      try {
        this.chart.resize();
      } catch {
        // Chart may be mid-teardown when the modal closes or type switches.
      }
    });
    const target = this.canvas.parentElement ?? this.canvas;
    if (target.isConnected) {
      this.observer.observe(target);
    }
  }

  render(config: ChartConfiguration): Chart {
    this.chart?.destroy();
    this.chart = new Chart(this.canvas, config);
    return this.chart;
  }

  getChart(): Chart | null {
    return this.chart;
  }

  destroy(): void {
    this.alive = false;
    this.observer?.disconnect();
    this.observer = null;
    this.chart?.destroy();
    this.chart = null;
  }
}
