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

interface MonthlyTouristArrivalsDataChartProps {
  forecasts: DemandForecast[];
  year: number;
  years?: number[];
  onYearChange?: (year: number) => void;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const MonthlyTouristArrivalsDataChart: React.FC<MonthlyTouristArrivalsDataChartProps> = ({
  forecasts,
  year,
  years = [],
  onYearChange,
}) => {
  const { isDarkMode } = useDarkMode();

  const monthlyActualTotals = useMemo(() => {
    const totals = Array(12).fill(0) as number[];

    forecasts.forEach((entry) => {
      const entryDate = new Date(entry.date);
      const isForecast = String(entry.id || '').startsWith('ml-f-') || String(entry.accommodationType || '').toLowerCase().includes('forecast');
      if (isForecast) return;
      if (entryDate.getFullYear() !== year) return;
      totals[entryDate.getMonth()] += entry.actualOccupancy;
    });

    return totals;
  }, [forecasts, year]);

  const hasAnyActualData = monthlyActualTotals.some((value) => value > 0);

  const chartData = {
    labels: MONTH_LABELS,
    datasets: [
      {
        label: `Actual Tourists (${year})`,
        data: monthlyActualTotals,
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37, 99, 235, 0.15)',
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
      },
    ],
  };

  const chartOptions = {
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
      <div className="relative flex items-center justify-center gap-3">
        <p className={`text-xl md:text-2xl font-bold text-center ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          Monthly Tourist Arrivals Data
        </p>
        {onYearChange && years.length > 0 && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <select
              value={year}
              onChange={(event) => onYearChange(Number(event.target.value))}
              className={`p-2 rounded border outline-none text-sm ${isDarkMode ? 'bg-slate-900 text-white border-slate-700' : 'bg-white border-gray-300'}`}
            >
              {years.map((itemYear) => (
                <option key={itemYear} value={itemYear}>{itemYear}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="h-72 md:h-80 mt-4">
        <Line data={chartData} options={chartOptions} />
      </div>

      {!hasAnyActualData && (
        <p className={`text-sm text-center mt-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          No actual tourist arrivals data available for this year.
        </p>
      )}
    </div>
  );
};