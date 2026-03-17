import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useDarkMode } from '../contexts/DarkModeContext';
import { DemandForecast } from '../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface TouristForecastTrendChartProps {
  forecasts: DemandForecast[];
}

interface MonthlyAggregate {
  monthStart: Date;
  actualTotal: number;
}

const monthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const TouristForecastTrendChart: React.FC<TouristForecastTrendChartProps> = ({
  forecasts,
}) => {
  const { isDarkMode } = useDarkMode();

  const chartSeries = useMemo(() => {
    if (forecasts.length === 0) {
      return {
        labels: [] as string[],
        actualData: [] as Array<number | null>,
      };
    }

    const grouped = forecasts.reduce<Record<string, MonthlyAggregate>>((acc, item) => {
      const itemDate = new Date(item.date);
      const monthStart = new Date(itemDate.getFullYear(), itemDate.getMonth(), 1);
      const key = monthKey(monthStart);

      if (!acc[key]) {
        acc[key] = {
          monthStart,
          actualTotal: 0,
        };
      }

      acc[key].actualTotal += item.actualOccupancy;
      return acc;
    }, {});

    const monthlyData = Object.values(grouped).sort(
      (a, b) => a.monthStart.getTime() - b.monthStart.getTime()
    );

    if (monthlyData.length === 0) {
      return {
        labels: [] as string[],
        actualData: [] as Array<number | null>,
      };
    }

    return {
      labels: monthlyData.map((entry) =>
        entry.monthStart.toLocaleString('default', { month: 'short', year: 'numeric' })
      ),
      actualData: monthlyData.map((entry) => Math.round(entry.actualTotal)),
    };
  }, [forecasts]);

  if (chartSeries.labels.length === 0) {
    return (
      <div
        className={`rounded-lg shadow p-6 ${
          isDarkMode ? 'bg-slate-800 text-gray-300' : 'bg-white text-gray-600'
        }`}
      >
        No tourist forecast data available
      </div>
    );
  }

  const data = {
    labels: chartSeries.labels,
    datasets: [
      {
        label: 'Actual Tourists',
        data: chartSeries.actualData,
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37, 99, 235, 0.2)',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
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
          padding: 48,
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
      <div className="grid grid-cols-1 items-center gap-2 mb-0">
        <p className={`text-xl md:text-2xl font-bold text-center ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          Monthly Tourist Trend
        </p>
      </div>

      <div className="h-72 md:h-80 mt-0">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};
