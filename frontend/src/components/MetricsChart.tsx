import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { useDarkMode } from '../contexts/DarkModeContext';
import { ForecastMetrics } from '../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface MetricsChartProps {
  metrics: ForecastMetrics[];
  title?: string;
}
export const MetricsChart: React.FC<MetricsChartProps> = ({ metrics, title = 'Forecast Performance Metrics Over Time' }) => {
  const { isDarkMode } = useDarkMode();

  if (metrics.length === 0) {
    return <div className={`p-4 rounded text-center ${isDarkMode ? 'bg-slate-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>No data available</div>;
  }

  const last10Metrics = metrics.slice(-10).reverse();
  const labels = last10Metrics.map((_, i) => `${i + 1}`);

  const data = {
    labels,
    datasets: [
      {
        label: 'MAPE (%)',
        data: last10Metrics.map(m => m.mape.toFixed(2)),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'MAE (rooms)',
        data: last10Metrics.map(m => m.mae.toFixed(2)),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'R² Score',
        data: last10Metrics.map(m => (m.r2Score * 100).toFixed(2)),
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: isDarkMode ? '#e5e7eb' : '#374151',
        },
      },
      title: {
        display: true,
        text: title,
        font: { size: 16, weight: 'bold' as any },
        color: isDarkMode ? '#f3f4f6' : '#1f2937',
      },
    },
    scales: {
      x: {
        ticks: {
          color: isDarkMode ? '#9ca3af' : '#6b7280',
        },
        grid: {
          color: isDarkMode ? '#374151' : '#e5e7eb',
        },
      },
      y: {
        ticks: {
          color: isDarkMode ? '#9ca3af' : '#6b7280',
        },
        grid: {
          color: isDarkMode ? '#374151' : '#e5e7eb',
        },
      },
    },
  };

  return (
    <div className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
      <Line data={data} options={options} />
    </div>
  );
};
