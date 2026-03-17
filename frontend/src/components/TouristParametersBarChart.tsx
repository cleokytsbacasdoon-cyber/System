import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useDarkMode } from '../contexts/DarkModeContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface TouristParameterPoint {
  label: string;
  value: number;
}

interface TouristParametersBarChartProps {
  parameters: TouristParameterPoint[];
}

export const TouristParametersBarChart: React.FC<TouristParametersBarChartProps> = ({ parameters }) => {
  const { isDarkMode } = useDarkMode();

  const data = {
    labels: parameters.map((item) => item.label),
    datasets: [
      {
        label: 'Parameter Value',
        data: parameters.map((item) => item.value),
        backgroundColor: [
          'rgba(37, 99, 235, 0.85)',
          'rgba(2, 132, 199, 0.85)',
          'rgba(14, 116, 144, 0.85)',
          'rgba(56, 189, 248, 0.85)',
          'rgba(59, 130, 246, 0.85)',
          'rgba(14, 165, 233, 0.85)',
          'rgba(3, 105, 161, 0.85)',
        ],
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: isDarkMode ? '#E5E7EB' : '#374151',
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: isDarkMode ? '#9CA3AF' : '#6B7280',
        },
        grid: {
          color: isDarkMode ? '#334155' : '#E5E7EB',
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: isDarkMode ? '#9CA3AF' : '#6B7280',
        },
        grid: {
          color: isDarkMode ? '#334155' : '#E5E7EB',
        },
      },
    },
  };

  return (
    <div className={`rounded-lg shadow p-4 md:p-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
      <p className={`text-xl md:text-2xl font-bold text-center ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
        Tourist Trend Parameters
      </p>

      <div className="h-72 md:h-80 mt-4">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};