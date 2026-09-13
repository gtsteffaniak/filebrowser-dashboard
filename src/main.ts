import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { App } from './app/App';
import './theme/tokens.css';
import './styles/expand-dropdown.css';
import './styles/dashboard.css';

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ArcElement,
  DoughnutController,
  Legend,
  Tooltip,
  Filler,
  zoomPlugin,
);

const appEl = document.getElementById('app');
if (!appEl) throw new Error('#app not found');

new App(appEl).start();
