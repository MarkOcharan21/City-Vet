import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Registered once, in one place: the analytics panels mix bar, doughnut and
// line charts, and Chart.js needs every element type to be registered before
// the first render of that type.
ChartJS.register(
  CategoryScale,
  LinearScale,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
  ChartDataLabels
);

export { ChartJS, ChartDataLabels };
