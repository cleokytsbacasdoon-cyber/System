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
  year: number; // 0 = All Years (2016–present) overview
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

  // ── All-Years mode (year === 0): 10-year historical view with 80/20 train-test split ──
  const allYearsData = useMemo(() => {
    if (year !== 0) return null;

    const baseMap = new Map<string, { actual: number; predicted: number }>();
    const futureMap = new Map<string, { actual: number; predicted: number }>();

    forecasts.forEach((entry) => {
      const d = new Date(entry.date);
      const entryYear = d.getFullYear();
      const isForecast =
        String(entry.id || '').startsWith('ml-f-') ||
        String(entry.accommodationType || '').toLowerCase().includes('forecast');
      if (isForecast || entryYear < 2016) return;
      const key = `${entryYear}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const map = entryYear <= 2025 ? baseMap : futureMap;
      const existing = map.get(key) ?? { actual: 0, predicted: 0 };
      existing.actual += entry.actualOccupancy;
      if (entry.predictedOccupancy > 0) existing.predicted += entry.predictedOccupancy;
      map.set(key, existing);
    });

    const baseKeys = [...baseMap.keys()].sort();
    if (baseKeys.length === 0) return null;

    const futureKeys = [...futureMap.keys()].sort();
    const allKeys = [...baseKeys, ...futureKeys];

    // 80/20 time-based split — anchored to 2016-2025 base period only
    const splitIdx = Math.floor(baseKeys.length * 0.8);
    const boundaryKey = baseKeys[splitIdx] ?? baseKeys[baseKeys.length - 1];
    const [bYear, bMonth] = boundaryKey.split('-');
    const boundaryLabel = `${MONTH_LABELS[Number(bMonth) - 1]} ${bYear}`;
    const lastTrainKey = baseKeys[splitIdx - 1] ?? baseKeys[0];
    const [ltYear, ltMonth] = lastTrainKey.split('-');
    const lastTrainLabel = `${MONTH_LABELS[Number(ltMonth) - 1]} ${ltYear}`;

    const allLabels = allKeys.map((k) => {
      const [yr, mo] = k.split('-');
      return `${MONTH_LABELS[Number(mo) - 1]} ${yr}`;
    });

    // Training actuals (first 80% of base period)
    const trainActual: Array<number | null> = allKeys.map((k, i) =>
      i <= splitIdx ? (baseMap.get(k)?.actual ?? null) : null,
    );
    // Test actuals (last 20% of base period)
    const testActual: Array<number | null> = allKeys.map((k, i) =>
      i >= splitIdx && i < baseKeys.length ? (baseMap.get(k)?.actual ?? null) : null,
    );
    // Combined actual (blue) — all base period data in one line
    const actualAll: Array<number | null> = allKeys.map((k, i) =>
      i < baseKeys.length ? (baseMap.get(k)?.actual ?? null) : null,
    );
    // 2026+ actuals as a separate dataset
    const currentActual: Array<number | null> = allKeys.map((k) => {
      const v = futureMap.get(k)?.actual ?? 0;
      return v > 0 ? v : null;
    });
    const hasCurrentActual = currentActual.some((v) => v !== null);

    const allPredicted: Array<number | null> = allKeys.map((k) => {
      const v = (baseMap.get(k) ?? futureMap.get(k))?.predicted ?? 0;
      return v > 0 ? v : null;
    });
    // Orange predicted — only shown over the test set period
    const testPredicted: Array<number | null> = allKeys.map((k, i) => {
      if (i < splitIdx || i >= baseKeys.length) return null;
      const v = baseMap.get(k)?.predicted ?? 0;
      return v > 0 ? v : null;
    });
    const hasTestPredicted = testPredicted.some((v) => v !== null);
    const hasPredicted = allPredicted.some((v) => v !== null);

    return {
      allLabels,
      trainActual,
      testActual,
      actualAll,
      currentActual,
      hasCurrentActual,
      testPredicted,
      hasTestPredicted,
      allPredicted,
      hasPredicted,
      splitIdx,
      totalBaseMonths: baseKeys.length,
      totalMonths: allKeys.length,
      boundaryLabel,
      lastTrainLabel,
    };
  }, [year, forecasts]);

  // ── Single-year mode ──
  const { monthlyActualTotals, monthlyPredictedTotals } = useMemo(() => {
    const actuals = Array(12).fill(null) as Array<number | null>;
    const predicted = Array(12).fill(null) as Array<number | null>;

    if (year === 0) return { monthlyActualTotals: actuals, monthlyPredictedTotals: predicted };

    forecasts.forEach((entry) => {
      const entryDate = new Date(entry.date);
      const isForecast = String(entry.id || '').startsWith('ml-f-') || String(entry.accommodationType || '').toLowerCase().includes('forecast');
      if (isForecast) return;
      if (entryDate.getFullYear() !== year) return;
      const m = entryDate.getMonth();
      actuals[m] = (actuals[m] ?? 0) + entry.actualOccupancy;
      if (entry.predictedOccupancy > 0) {
        predicted[m] = (predicted[m] ?? 0) + entry.predictedOccupancy;
      }
    });

    return { monthlyActualTotals: actuals, monthlyPredictedTotals: predicted };
  }, [forecasts, year]);

  const hasAnyActualData = monthlyActualTotals.some((value) => value !== null && value > 0);
  // Only show predicted line for test-set years (2024+) and future years.
  // 2016–2023 is the training period — predictions there are not meaningful to display.
  const showPredicted = year >= 2024;
  const hasAnyPredictedData = showPredicted && monthlyPredictedTotals.some((value) => value !== null && value > 0);

  const singleYearChartData = {
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
        spanGaps: true,
      },
      ...(hasAnyPredictedData ? [{
        label: `Predicted Tourists (${year})`,
        data: monthlyPredictedTotals,
        borderColor: '#F97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        borderDash: [5, 4],
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
        spanGaps: true,
      }] : []),
    ],
  };

  const tickColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const gridColor = isDarkMode ? '#334155' : '#E5E7EB';

  const singleYearOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { color: isDarkMode ? '#E5E7EB' : '#374151' } },
    },
    scales: {
      x: { ticks: { color: tickColor }, grid: { color: gridColor } },
      y: { beginAtZero: true, ticks: { color: tickColor }, grid: { color: gridColor } },
    },
  };

  // ── All-Years chart config ──
  const allYearsChartData = allYearsData
    ? {
        labels: allYearsData.allLabels,
        datasets: [
          {
            label: 'Actual Tourist Arrivals',
            data: allYearsData.actualAll,
            borderColor: '#2563EB',
            backgroundColor: 'rgba(37, 99, 235, 0.12)',
            fill: true,
            pointRadius: 2,
            pointHoverRadius: 5,
            tension: 0.35,
            spanGaps: false,
          },
          {
            label: 'Actual – Test (20%)',
            data: allYearsData.testActual,
            borderColor: '#2563EB',
            backgroundColor: 'rgba(37, 99, 235, 0.15)',
            fill: true,
            pointRadius: 2,
            pointHoverRadius: 5,
            tension: 0.35,
            spanGaps: false,
          },
          ...(allYearsData.hasCurrentActual
            ? [
                {
                  label: 'Actual – 2026',
                  data: allYearsData.currentActual,
                  borderColor: '#16A34A',
                  backgroundColor: 'rgba(22, 163, 74, 0.12)',
                  fill: true,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                  tension: 0.35,
                  spanGaps: false,
                },
              ]
            : []),
          ...(allYearsData.hasTestPredicted
            ? [
                {
                  label: 'Model Predicted (Test Set)',
                  data: allYearsData.testPredicted,
                  borderColor: '#F97316',
                  backgroundColor: 'transparent',
                  borderDash: [5, 4],
                  fill: false,
                  pointRadius: 2,
                  pointHoverRadius: 5,
                  tension: 0.35,
                  spanGaps: true,
                },
              ]
            : []),
        ],
      }
    : null;

  const allYearsOptions = allYearsData
    ? {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' as const, labels: { color: isDarkMode ? '#E5E7EB' : '#374151' } },
          tooltip: {
            callbacks: {
              title: (items: { label: string }[]) => items[0]?.label ?? '',
            },
          },
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 45,
              color: tickColor,
              callback: (_val: unknown, index: number) => {
                const lbl = allYearsData.allLabels[index] ?? '';
                // Only show January labels to avoid overcrowding
                return lbl.startsWith('Jan') ? lbl : '';
              },
            },
            grid: { color: gridColor },
          },
          y: { beginAtZero: true, ticks: { color: tickColor }, grid: { color: gridColor } },
        },
      }
    : null;

  const yearSelectorEl = onYearChange ? (
    <div className="absolute right-0 top-1/2 -translate-y-1/2">
      <select
        value={year}
        onChange={(e) => onYearChange(Number(e.target.value))}
        className={`p-2 rounded border outline-none text-sm ${isDarkMode ? 'bg-slate-900 text-white border-slate-700' : 'bg-white border-gray-300'}`}
      >
        <option value={0}>All Years (2016–present)</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  ) : null;

  // ── All-Years render ──
  if (year === 0) {
    return (
      <div className={`rounded-lg shadow p-4 md:p-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <div className="relative flex items-center justify-center gap-3 mb-2">
          <p className={`text-xl md:text-2xl font-bold text-center ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
            Monthly Tourist Arrivals Data
          </p>
          {yearSelectorEl}
        </div>

        {/* 80 / 20 split info banner */}
        <div className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-blue-600" />
            <strong className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>Actual</strong>
            &nbsp;Jan 2016 – Dec 2025
          </span>
          <span className={isDarkMode ? 'text-slate-600' : 'text-gray-300'}>|</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-0.5 bg-orange-500" style={{borderTop:'2px dashed #F97316',display:'inline-block'}} />
            <strong className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>Predicted (test set)</strong>
            &nbsp;{allYearsData?.boundaryLabel ?? '…'} – Dec 2025
          </span>
          {allYearsData?.hasCurrentActual && (
            <>
              <span className={isDarkMode ? 'text-slate-600' : 'text-gray-300'}>|</span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-green-600" />
                <strong className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>2026 Actual</strong>
              </span>
            </>
          )}
          {allYearsData && (
            <>
              <span className={isDarkMode ? 'text-slate-600' : 'text-gray-300'}>|</span>
              <span>{allYearsData.splitIdx} train / {allYearsData.totalBaseMonths - allYearsData.splitIdx} test months</span>
            </>
          )}
        </div>

        <div className="h-80 md:h-96">
          {allYearsChartData && allYearsOptions ? (
            <Line data={allYearsChartData} options={allYearsOptions} />
          ) : (
            <p className={`text-sm text-center mt-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No historical data available for 2016–2025.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Single-year render ──
  return (
    <div className={`rounded-lg shadow p-4 md:p-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
      <div className="relative flex items-center justify-center gap-3">
        <p className={`text-xl md:text-2xl font-bold text-center ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          Monthly Tourist Arrivals Data
        </p>
        {yearSelectorEl}
      </div>

      <div className="h-72 md:h-80 mt-4">
        <Line data={singleYearChartData} options={singleYearOptions} />
      </div>

      {!hasAnyActualData && (
        <p className={`text-sm text-center mt-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          No actual tourist arrivals data available for this year.
        </p>
      )}
    </div>
  );
};