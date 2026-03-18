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
  monthsAhead: number;
  horizonSelectorValue?: 3 | 6 | 12;
  onHorizonSelectorChange?: (value: 3 | 6 | 12) => void;
  centerTitle?: boolean;
}

interface MonthlyAggregate {
  monthStart: Date;
  actualTotal: number;
  predictedTotal: number;
  isForecast: boolean;
}

const monthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const TouristForecastTrendChart: React.FC<TouristForecastTrendChartProps> = ({
  forecasts,
  monthsAhead,
  horizonSelectorValue,
  onHorizonSelectorChange,
  centerTitle = false,
}) => {
  const { isDarkMode } = useDarkMode();

  const chartSeries = useMemo(() => {
    if (forecasts.length === 0) {
      return {
        labels: [] as string[],
        actualData: [] as Array<number | null>,
        predictedData: [] as Array<number | null>,
      };
    }

    const grouped = forecasts.reduce<Record<string, MonthlyAggregate>>((acc, item) => {
      const itemDate = new Date(item.date);
      const monthStart = new Date(itemDate.getFullYear(), itemDate.getMonth(), 1);
      const key = monthKey(monthStart);

      if (!acc[key]) {
        const isForecast = String(item.id || '').startsWith('ml-f-')
          || String(item.accommodationType || '').toLowerCase().includes('forecast');

        acc[key] = {
          monthStart,
          actualTotal: 0,
          predictedTotal: 0,
          isForecast,
        };
      }

      acc[key].actualTotal += item.actualOccupancy;
      acc[key].predictedTotal += item.predictedOccupancy;
      if (String(item.id || '').startsWith('ml-f-')) {
        acc[key].isForecast = true;
      }
      return acc;
    }, {});

    const monthlyData = Object.values(grouped).sort(
      (a, b) => a.monthStart.getTime() - b.monthStart.getTime()
    );

    if (monthlyData.length === 0) {
      return {
        labels: [] as string[],
        actualData: [] as Array<number | null>,
        predictedData: [] as Array<number | null>,
      };
    }

    const historical = monthlyData.filter((entry) => !entry.isForecast);
    const future = monthlyData.filter((entry) => entry.isForecast).slice(0, monthsAhead);
    const lastThreeActual = historical.slice(-3);

    const combined = [...lastThreeActual, ...future];
    const labels = combined.map((entry) =>
      entry.monthStart.toLocaleString('default', { month: 'short', year: 'numeric' })
    );

    const actualData = combined.map((entry, index) => {
      if (index < lastThreeActual.length) {
        return Math.round(entry.actualTotal);
      }
      return null;
    });

    const predictedData = combined.map((entry, index) => {
      if (index < lastThreeActual.length - 1) {
        return null;
      }

      if (index === lastThreeActual.length - 1) {
        return Math.round(entry.actualTotal);
      }

      return Math.round(entry.predictedTotal);
    });

    return {
      labels,
      actualData,
      predictedData,
    };
  }, [forecasts, monthsAhead]);

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
        spanGaps: true,
      },
      {
        label: `Predicted Tourists (${monthsAhead} months)`,
        data: chartSeries.predictedData,
        borderColor: '#F97316',
        backgroundColor: 'rgba(249, 115, 22, 0.2)',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
        spanGaps: true,
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
      <div className={`relative flex items-center gap-3 mb-0 ${centerTitle ? 'justify-center' : 'justify-between'}`}>
        <p className={`text-xl md:text-2xl font-bold ${centerTitle ? 'text-center' : ''} ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          Monthly Tourist Trend
        </p>
        {onHorizonSelectorChange && horizonSelectorValue && (
          <div className={centerTitle ? 'absolute right-0 top-1/2 -translate-y-1/2' : ''}>
            <select
              value={horizonSelectorValue}
              onChange={(e) => onHorizonSelectorChange(Number(e.target.value) as 3 | 6 | 12)}
              className={`p-2 rounded border outline-none text-sm ${isDarkMode ? 'bg-slate-900 text-white border-slate-700' : 'bg-white border-gray-300'}`}
            >
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
            </select>
          </div>
        )}
      </div>

      <div className="h-72 md:h-80 mt-0">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};
