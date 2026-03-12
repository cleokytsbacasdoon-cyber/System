import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { useDarkMode } from '../contexts/DarkModeContext';
import { ForecastMetrics } from '../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface PerformanceChartProps {
  latest: ForecastMetrics | null;
  title?: string;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ latest, title = 'Latest Forecast Performance' }) => {
  const { isDarkMode } = useDarkMode();

  if (!latest) {
    return <div className={`p-4 rounded text-center ${isDarkMode ? 'bg-slate-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>No data available</div>;
  }

  const data = {
    labels: ['MAPE (%)', 'RMSE (rooms)', 'MAE (rooms)', 'R² Score (x100)'],
    datasets: [
      {
        label: 'Metric Value',
        data: [
          (latest.accuracy * 100).toFixed(2),
          (latest.precision * 100).toFixed(2),
          (latest.recall * 100).toFixed(2),
          (latest.f1Score * 100).toFixed(2),
        ],
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#8B5CF6',
        ],
        borderRadius: 8,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
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
        min: 0,
        max: 100,
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
      <Bar data={data} options={options} />
    </div>
  );
};
