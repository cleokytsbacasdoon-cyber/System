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
  predictedMonths: 3 | 6 | 12;
  onPredictedMonthsChange: (months: 3 | 6 | 12) => void;
}

interface MonthlyAggregate {
  monthStart: Date;
  actualTotal: number;
  predictedTotal: number;
}

const monthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const TouristForecastTrendChart: React.FC<TouristForecastTrendChartProps> = ({
  forecasts,
  predictedMonths,
  onPredictedMonthsChange,
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
        acc[key] = {
          monthStart,
          actualTotal: 0,
          predictedTotal: 0,
        };
      }

      acc[key].actualTotal += item.actualOccupancy;
      acc[key].predictedTotal += item.predictedOccupancy;
      return acc;
    }, {});

    const monthlyData = Object.values(grouped).sort(
      (a, b) => a.monthStart.getTime() - b.monthStart.getTime()
    );
    const latestThreeActual = monthlyData.slice(-3);

    if (latestThreeActual.length === 0) {
      return {
        labels: [] as string[],
        actualData: [] as Array<number | null>,
        predictedData: [] as Array<number | null>,
      };
    }

    const recentPredictedTotals = monthlyData.slice(-3).map((entry) => entry.predictedTotal);
    const basePrediction = recentPredictedTotals[recentPredictedTotals.length - 1] ?? 0;

    let averageMonthlyChange = 0;
    if (recentPredictedTotals.length > 1) {
      const deltas = recentPredictedTotals
        .slice(1)
        .map((value, index) => value - recentPredictedTotals[index]);
      averageMonthlyChange = deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length;
    }

    const lastActualMonthStart = latestThreeActual[latestThreeActual.length - 1].monthStart;
    const projectedMonths = Array.from({ length: predictedMonths }, (_, index) => {
      const projectedMonthStart = new Date(
        lastActualMonthStart.getFullYear(),
        lastActualMonthStart.getMonth() + index + 1,
        1
      );
      const projectedValue = Math.max(0, basePrediction + averageMonthlyChange * (index + 1));

      return {
        monthStart: projectedMonthStart,
        total: Math.round(projectedValue),
      };
    });

    const actualLabels = latestThreeActual.map((entry) =>
      entry.monthStart.toLocaleString('default', { month: 'short', year: 'numeric' })
    );
    const projectedLabels = projectedMonths.map((entry) =>
      entry.monthStart.toLocaleString('default', { month: 'short', year: 'numeric' })
    );

    return {
      labels: [...actualLabels, ...projectedLabels],
      actualData: [
        ...latestThreeActual.map((entry) => Math.round(entry.actualTotal)),
        ...Array(predictedMonths).fill(null),
      ],
      predictedData: [
        ...Array(latestThreeActual.length).fill(null),
        ...projectedMonths.map((entry) => entry.total),
      ],
    };
  }, [forecasts, predictedMonths]);

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
        borderColor: '#F97316',
        backgroundColor: 'rgba(249, 115, 22, 0.2)',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
      },
      {
        label: 'Predicted Tourists',
        data: chartSeries.predictedData,
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37, 99, 235, 0.15)',
        borderDash: [6, 6],
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
          padding: 8,
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
      <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3 mb-4">
        <div className="hidden sm:block" />
        <p className={`text-xl md:text-2xl font-bold text-center ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          Monthly Tourist Trend
        </p>
        <div className="flex sm:justify-end">
          <select
            value={predictedMonths}
            onChange={(event) => onPredictedMonthsChange(Number(event.target.value) as 3 | 6 | 12)}
            className={`w-full sm:w-auto px-3 py-2 rounded border text-sm outline-none ${
              isDarkMode ? 'bg-slate-900 border-slate-700 text-gray-100' : 'bg-white border-gray-300 text-gray-700'
            }`}
          >
            <option value={3}>3 months</option>
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
          </select>
        </div>
      </div>

      <div className="h-72 md:h-80 mt-2">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};
