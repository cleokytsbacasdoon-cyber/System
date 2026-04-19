import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { TouristForecastTrendChart } from '../components/TouristForecastTrendChart';
import { MonthlyTouristArrivalsDataChart } from '../components/MonthlyTouristArrivalsDataChart';
import { 
  getModelMetrics, 
  getDriftAlerts, 
  getAPIEndpoints,
  getDemandForecasts,
  getDataQuality,
  getMonthlyTourismDataset,
  getTop10MarketHolidays,
  getTrainedModels,
  getRetrainingJobs,
  getCheckinsSubmission,
  CheckinsSubmissionData,
  upsertMonthlyTourismDataset,
  syncTop10MarketHolidaysFromPanglao,
  retrainAndCompareAll,
  CompareAllRetrainResult,
} from '../services/api';
import { fetchMonthlyWeather, MonthlyWeather } from '../services/weatherService';
import { useToast } from '../contexts/ToastContext';
import { ModelMetrics, DriftAlert, APIEndpoint, DemandForecast, DataQuality, MonthlyTourismDatasetRecord, Top10MarketHolidayRecord, TrainedModel } from '../types';

interface DashboardProps {
  onSettingsClick: () => void;
}

interface TouristTrendParameter {
  label: string;
  value: string;
  holidayRows?: Array<{ rank: number; country: string; holidayCount: number }>;
  totalHolidays?: number | null;
}

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
}

type DashboardIconName =
  | 'dashboard'
  | 'metrics'
  | 'retraining'
  | 'info'
  | 'notification'
  | 'sun'
  | 'moon'
  | 'settings';

interface DashboardIconProps {
  name: DashboardIconName;
  className?: string;
}

const DashboardIcon: React.FC<DashboardIconProps> = ({ name, className = 'h-5 w-5' }) => {
  const baseProps = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (name) {
    case 'dashboard':
      return (
        <svg {...baseProps}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M8 15v-3" />
          <path d="M12 15V9" />
          <path d="M16 15v-5" />
        </svg>
      );
    case 'metrics':
      return (
        <svg {...baseProps}>
          <path d="M3 19h18" />
          <path d="M5 15l4-4 3 2 6-6" />
          <path d="M18 7h2v2" />
        </svg>
      );
    case 'retraining':
      return (
        <svg {...baseProps}>
          <path d="M3 12a9 9 0 0 1 15.3-6.3" />
          <path d="M18 2.5v4h-4" />
          <path d="M21 12a9 9 0 0 1-15.3 6.3" />
          <path d="M6 21.5v-4h4" />
        </svg>
      );
    case 'info':
      return (
        <svg {...baseProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10v6" />
          <path d="M12 7h.01" />
        </svg>
      );
    case 'notification':
      return (
        <svg {...baseProps}>
          <path d="M15 17H9" />
          <path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16l-2-2z" />
        </svg>
      );
    case 'sun':
      return (
        <svg {...baseProps}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5V5" />
          <path d="M12 19v2.5" />
          <path d="M21.5 12H19" />
          <path d="M5 12H2.5" />
          <path d="M18.4 5.6l-1.8 1.8" />
          <path d="M7.4 16.6l-1.8 1.8" />
          <path d="M18.4 18.4l-1.8-1.8" />
          <path d="M7.4 7.4L5.6 5.6" />
        </svg>
      );
    case 'moon':
      return (
        <svg {...baseProps}>
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5z" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...baseProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1.8 1.8 0 0 1-3.6 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1.8 1.8 0 0 1 0-3.6h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1.8 1.8 0 0 1 3.6 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a1.8 1.8 0 0 1 0 3.6h-.2a1 1 0 0 0-.9.6z" />
        </svg>
      );
    default:
      return null;
  }
};

export const Dashboard: React.FC<DashboardProps> = ({ onSettingsClick }) => {
  const { addToast } = useToast();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [metrics, setMetrics] = useState<ModelMetrics[]>([]);
  const [alerts, setAlerts] = useState<DriftAlert[]>([]);
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
  const [forecasts, setForecasts] = useState<DemandForecast[]>([]);
  const [monthlyTourismData, setMonthlyTourismData] = useState<MonthlyTourismDatasetRecord[]>([]);
  const [top10MarketHolidayData, setTop10MarketHolidayData] = useState<Top10MarketHolidayRecord[]>([]);
  const [futureCheckinsSubmission, setFutureCheckinsSubmission] = useState<CheckinsSubmissionData | null>(() => {
    try { return JSON.parse(localStorage.getItem('ml-future-checkins') ?? 'null') as CheckinsSubmissionData | null; }
    catch { return null; }
  });
  const [simulateCheckinsSubmission, setSimulateCheckinsSubmission] = useState<CheckinsSubmissionData | null>(null);
  const [simulateCheckinsLoading, setSimulateCheckinsLoading] = useState(false);
  const [trainedModels, setTrainedModels] = useState<TrainedModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('xgboost');
  const [dataQuality, setDataQuality] = useState<DataQuality | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDashboardDate, setSelectedDashboardDate] = useState<Date | null>(null);
  const [dashboardHolidayCountApi, setDashboardHolidayCountApi] = useState<number | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('ml-notifications') ?? '[]') as NotificationItem[]; }
    catch { return []; }
  });
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('ml-read-notification-ids') ?? '[]') as string[]; }
    catch { return []; }
  });
  const [predictionHorizonMonths, setPredictionHorizonMonths] = useState<3 | 6 | 12>(3);
  const [simulateYear, setSimulateYear] = useState(() => {
    const now = new Date();
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return Math.max(prevYear, 2025);
  });
  const [simulateMonth, setSimulateMonth] = useState(() => {
    const now = new Date();
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    // 2025 only has December available
    if (prevYear <= 2025) return 12;
    return prevMonth;
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastCompareResult, setLastCompareResult] = useState<CompareAllRetrainResult | null>(() => {
    try { return JSON.parse(localStorage.getItem('ml-last-compare-result') ?? 'null') as CompareAllRetrainResult | null; }
    catch { return null; }
  });
  const [manualInflationRate, setManualInflationRate] = useState('');
  const [manualIsLockdown, setManualIsLockdown] = useState<'yes' | 'no'>('no');
  const [autoRetrainingEnabled, setAutoRetrainingEnabled] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('ml-auto-retrain-enabled') ?? 'true') as boolean; }
    catch { return true; }
  });
  const [weatherLatencyMs, setWeatherLatencyMs] = useState<number | null>(null);
  const [chartViewYear, setChartViewYear] = useState<number>(0);
  const [nationalitiesApiLatencyMs, setNationalitiesApiLatencyMs] = useState<number | null>(null);
  const [holidayLatencyMs, setHolidayLatencyMs] = useState<number | null>(null);
  const [panglaoLatencyMs, setPanglaoLatencyMs] = useState<number | null>(null);
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);
  const knownAlertIdsRef = useRef<Set<string>>(new Set());
  const previousEndpointStatusRef = useRef<Map<string, APIEndpoint['status']>>(new Map());
  const schedulerStateRef = useRef<{ lastCheckedDay: string | null; pendingRetrainSince: string | null }>(
    (() => {
      try { return JSON.parse(localStorage.getItem('ml-auto-retrain-scheduler') ?? 'null') ?? { lastCheckedDay: null, pendingRetrainSince: null }; }
      catch { return { lastCheckedDay: null, pendingRetrainSince: null }; }
    })()
  );

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const MODEL_LABELS: Record<string, string> = {
    xgboost: 'XGBoost',
    lstm: 'LSTM',
    random_forest: 'Random Forest',
    prophet: 'Prophet',
  };
  const getModelLabel = (id: string) =>
    MODEL_LABELS[id] ?? id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const formatModelVersion = (version: string): string => {
    const mNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const parts = version.toLowerCase().split('_');
    const mIdx = parts.findIndex(p => mNames.includes(p));
    if (mIdx === -1) return version;
    const month = parts[mIdx];
    const year = parts[mIdx + 1] ?? '';
    const prefix = parts.slice(0, mIdx).filter(p => p !== 'base' && p !== 'eval' && p !== 'winner').join('_');
    const label = MODEL_LABELS[prefix] ?? prefix.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return `${label}_${month.charAt(0).toUpperCase() + month.slice(1)}_${year}`;
  };
  const years = Array.from({ length: 2030 - 2016 + 1 }, (_, i) => 2016 + i);       // dashboard tab
  const trainingYears = Array.from({ length: 2030 - 2025 + 1 }, (_, i) => 2025 + i); // training parameters

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(clockTimer);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [metricsData, alertsData, endpointsData, forecastsData, qualityData, monthlyTourismDataset, top10MarketHolidayDataset, trainedModelsData] = await Promise.all([
        getModelMetrics(),
        getDriftAlerts(),
        getAPIEndpoints(),
        getDemandForecasts(predictionHorizonMonths, selectedModel),
        getDataQuality(),
        getMonthlyTourismDataset(),
        getTop10MarketHolidays(),
        getTrainedModels(),
      ]);
      setMetrics(metricsData);
      setAlerts(alertsData);
      setEndpoints(endpointsData);
      setForecasts(forecastsData);
      setMonthlyTourismData(monthlyTourismDataset);
      setTop10MarketHolidayData(top10MarketHolidayDataset);
      setTrainedModels(trainedModelsData);
      setDataQuality(qualityData);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, predictionHorizonMonths, selectedModel]);

  useEffect(() => {
    loadData();

    const handleWindowFocus = () => {
      loadData();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadData]);

  // Pre-fetch and cache submission rates for all 2026+ months up to today, in the background.
  // This ensures every past month is available offline even if the user never navigated to it.
  useEffect(() => {
    const preCacheAllMonths = async () => {
      const now = new Date();
      const endYear = now.getFullYear();
      const endMonth = now.getMonth() + 1; // 1-indexed

      for (let y = 2026; y <= endYear; y++) {
        const lastMonth = y === endYear ? endMonth : 12;
        for (let m = 1; m <= lastMonth; m++) {
          const dashKey = `ml-dashboard-checkins-${y}-${m}`;
          const simKey = `ml-simulate-checkins-${y}-${m}`;
          // Skip if both keys already cached
          const alreadyCached =
            localStorage.getItem(dashKey) !== null &&
            localStorage.getItem(simKey) !== null;
          if (alreadyCached) continue;

          try {
            const data = await getCheckinsSubmission(y, m);
            try { localStorage.setItem(dashKey, JSON.stringify(data)); } catch { /* ignore */ }
            try { localStorage.setItem(simKey, JSON.stringify(data)); } catch { /* ignore */ }
          } catch {
            // Silently skip — backend or Panglao API unreachable for this month
          }
        }
      }
    };

    preCacheAllMonths();
  }, []); // Runs once on mount

  /**
   * Page-load catch-up: check if the backend auto-retrained this month while
   * the dashboard was closed, and surface a notification if so.
   * Runs once on mount (after initial loadData). Skipped in mock mode.
   */
  useEffect(() => {
    const checkMissedAutoRetrain = async () => {
      try {
        const jobs = await getRetrainingJobs();
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
        const notifId = `auto-retrain-catchup-${prevYear}-${String(prevMonth).padStart(2, '0')}`;

        const cronJob = jobs.find(
          (job) => job.modelId === `auto_cron_${prevYear}_${String(prevMonth).padStart(2, '0')}` && job.status === 'completed'
        );

        if (!cronJob) return;

        // Don't resurface if we already showed this notification
        const alreadyShown = JSON.parse(localStorage.getItem('ml-notifications') ?? '[]') as { id: string }[];
        if (alreadyShown.some((n) => n.id === notifId)) return;

        const trainedModels = await getTrainedModels();
        const activeModel = trainedModels.find((m) => m.inUse);
        const modelLookup: Record<string, string> = { xgboost: 'XGBoost', lstm: 'LSTM', random_forest: 'Random Forest', prophet: 'Prophet' };
        const rawName = (activeModel?.modelName ?? '').toLowerCase();
        const algoKey = Object.keys(modelLookup).find((k) => rawName.startsWith(k)) ?? '';
        const winnerLabel = modelLookup[algoKey] ?? activeModel?.modelName ?? 'Unknown';
        const accuracy = activeModel?.accuracy != null ? ` (${(activeModel.accuracy * 100).toFixed(1)}%)` : '';
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const monthLabel = `${monthNames[prevMonth - 1]} ${prevYear}`;
        const completedAt = cronJob.endTime ? new Date(cronJob.endTime).toLocaleString() : 'during your last session';

        addNotification({
          id: notifId,
          title: 'Auto-Retraining Completed (Background)',
          description: `The backend automatically retrained all 4 models for ${monthLabel} on ${completedAt}. Active model: ${winnerLabel}${accuracy}.`,
          timestamp: cronJob.endTime ?? new Date().toISOString(),
        });
      } catch {
        // Non-critical — silently skip if API is unavailable
      }
    };

    checkMissedAutoRetrain();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSimulateMonthlyRetraining = async () => {
    try {
      setIsSimulating(true);
      const result: CompareAllRetrainResult = await retrainAndCompareAll({
        baseModelName: 'xgboost_base',
        month: simulateMonth,
        year: simulateYear,
      });
      setSelectedModel(result.winner);
      setLastCompareResult(result);
      const winnerLabel = getModelLabel(result.winner);
      addToast(
        `All-model retraining done. Winner: ${winnerLabel} (${(result.winnerAccuracy * 100).toFixed(1)}% accuracy)`,
        'success'
      );
      await loadData();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to run all-model retraining', 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleDashboardMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = parseInt(e.target.value, 10);
    setSelectedDashboardDate((prev) => {
      const base = prev ?? new Date();
      return new Date(base.getFullYear(), month, 1);
    });
  };

  const handleDashboardYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = parseInt(e.target.value, 10);
    setSelectedDashboardDate((prev) => {
      const base = prev ?? new Date();
      return new Date(year, base.getMonth(), 1);
    });
  };

  const MONTH_NAMES_LONG = ['january','february','march','april','may','june','july','august','september','october','november','december'];

  // Only show months that have at least one trained model entry
  const accuracyMonthOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { year: number; month: number }[] = [];
    trainedModels.forEach((model) => {
      const parts = model.modelName.toLowerCase().split('_');
      const mIdx = parts.findIndex((p) => MONTH_NAMES_LONG.includes(p));
      if (mIdx === -1) return;
      const month = MONTH_NAMES_LONG.indexOf(parts[mIdx]) + 1;
      const year = parseInt(parts[mIdx + 1] ?? '');
      if (!year) return;
      const key = `${year}-${month}`;
      if (!seen.has(key)) { seen.add(key); options.push({ year, month }); }
    });
    options.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
    return options;
  }, [trainedModels]);

  // Default to the latest available month with data
  const [accuracyViewYear, setAccuracyViewYear] = useState<number>(() => new Date().getFullYear());
  const [accuracyViewMonth, setAccuracyViewMonth] = useState<number>(() => new Date().getMonth() + 1);

  // Sync selection to latest option when trainedModels first load
  useEffect(() => {
    if (accuracyMonthOptions.length === 0) return;
    const latest = accuracyMonthOptions[accuracyMonthOptions.length - 1];
    setAccuracyViewYear(latest.year);
    setAccuracyViewMonth(latest.month);
  }, [accuracyMonthOptions.length > 0]);

  const selectedAccuracyByModel = useMemo(() => {
    const map: Record<string, number | null> = { xgboost: null, lstm: null, random_forest: null, prophet: null };
    trainedModels.forEach((model) => {
      const parts = model.modelName.toLowerCase().split('_');
      const mIdx = parts.findIndex((p) => MONTH_NAMES_LONG.includes(p));
      if (mIdx === -1) return;
      const month = MONTH_NAMES_LONG.indexOf(parts[mIdx]) + 1;
      const year = parseInt(parts[mIdx + 1] ?? '');
      if (!year || month !== accuracyViewMonth || year !== accuracyViewYear) return;
      const rawType = parts.slice(0, mIdx).filter((p) => p !== 'base' && p !== 'eval' && p !== 'winner').join('_') || 'xgboost';
      const type = rawType.startsWith('xgboost') ? 'xgboost'
        : rawType === 'lstm' ? 'lstm'
        : rawType.startsWith('random_forest') ? 'random_forest'
        : rawType === 'prophet' ? 'prophet'
        : null;
      if (!type) return;
      const acc = model.accuracy ?? null;
      if (acc !== null && (map[type] === null || acc > (map[type] ?? 0))) map[type] = acc;
    });
    return map;
  }, [trainedModels, accuracyViewMonth, accuracyViewYear]);

  const forecastPerformanceTable = useMemo(() => {
    type ModelCell = { accuracy: number | null; inUse: boolean };
    type RowEntry = { year: number; month: number; xgboost: ModelCell; lstm: ModelCell; random_forest: ModelCell; prophet: ModelCell };
    const rowMap = new Map<string, RowEntry>();
    trainedModels.forEach((model) => {
      const parts = model.modelName.toLowerCase().split('_');
      const mIdx = parts.findIndex((p) => MONTH_NAMES_LONG.includes(p));
      if (mIdx === -1) return;
      const month = MONTH_NAMES_LONG.indexOf(parts[mIdx]) + 1;
      const year = parseInt(parts[mIdx + 1] ?? '');
      if (!year) return;
      if (year < 2025 || (year === 2025 && month < 12)) return;
      const key = `${year}-${String(month).padStart(2, '0')}`;
      if (!rowMap.has(key)) {
        rowMap.set(key, { year, month, xgboost: { accuracy: null, inUse: false }, lstm: { accuracy: null, inUse: false }, random_forest: { accuracy: null, inUse: false }, prophet: { accuracy: null, inUse: false } });
      }
      const row = rowMap.get(key)!;
      const rawType = parts.slice(0, mIdx).filter((p) => p !== 'base' && p !== 'eval' && p !== 'winner').join('_') || 'xgboost';
      const type = rawType.startsWith('xgboost') ? 'xgboost' as const
        : rawType === 'lstm' ? 'lstm' as const
        : rawType.startsWith('random_forest') ? 'random_forest' as const
        : rawType === 'prophet' ? 'prophet' as const
        : null;
      if (!type) return;
      const acc = model.accuracy ?? null;
      if (acc !== null && (row[type].accuracy === null || acc > (row[type].accuracy ?? 0))) row[type].accuracy = acc;
      if (model.inUse) row[type].inUse = true;
    });
    return Array.from(rowMap.values()).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
  }, [trainedModels]);

  const addNotification = useCallback((item: NotificationItem) => {
    setNotifications((prev) => [item, ...prev.filter((existing) => existing.id !== item.id)].slice(0, 20));
  }, []);

  // Persist notifications + autoRetrainingEnabled across page refreshes
  useEffect(() => {
    localStorage.setItem('ml-notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('ml-read-notification-ids', JSON.stringify(readNotificationIds));
  }, [readNotificationIds]);

  useEffect(() => {
    if (lastCompareResult) localStorage.setItem('ml-last-compare-result', JSON.stringify(lastCompareResult));
  }, [lastCompareResult]);

  useEffect(() => {
    localStorage.setItem('ml-auto-retrain-enabled', JSON.stringify(autoRetrainingEnabled));
  }, [autoRetrainingEnabled]);

  /**
   * Auto-retraining display checker:
   * - Runs every minute while the dashboard is open
   * - On the 10th of every month at 23:59 (and every day after until successful):
   *   checks if the backend has completed retraining for the previous month
   * - If completed → shows a success notification and reloads data
   * - If not yet completed → shows a "pending" notification (backend will retry tomorrow)
   * - The frontend NEVER triggers retraining — the backend owns all retrain logic
   */
  const runAutoRetrainCheck = useCallback(async () => {
    if (!autoRetrainingEnabled) return;

    const now = new Date();
    // Only fire at 23:59
    if (now.getHours() !== 23 || now.getMinutes() !== 59) return;

    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const sched = schedulerStateRef.current;

    // Already handled today — skip
    if (sched.lastCheckedDay === todayStr) return;

    const isScheduledDay = now.getDate() === 10;
    const isRetryDay = sched.pendingRetrainSince !== null;

    if (!isScheduledDay && !isRetryDay) return;

    // Mark today as processed immediately to prevent duplicate triggers within the same minute
    sched.lastCheckedDay = todayStr;
    localStorage.setItem('ml-auto-retrain-scheduler', JSON.stringify(sched));

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const monthLabel = `${months[prevMonth - 1]} ${prevYear}`;

    try {
      const jobs = await getRetrainingJobs();
      const backendCompleted = jobs.some(
        (job) => job.modelId === `auto_cron_${prevYear}_${String(prevMonth).padStart(2, '0')}` && job.status === 'completed'
      );

      if (backendCompleted) {
        // Backend finished — read result and notify
        const trainedModels = await getTrainedModels();
        const activeModel = trainedModels.find((m) => m.inUse);
        const modelLookup: Record<string, string> = { xgboost: 'XGBoost', lstm: 'LSTM', random_forest: 'Random Forest', prophet: 'Prophet' };
        const rawName = (activeModel?.modelName ?? '').toLowerCase();
        const algoKey = Object.keys(modelLookup).find((k) => rawName.startsWith(k)) ?? '';
        const winnerLabel = modelLookup[algoKey] ?? activeModel?.modelName ?? 'Unknown';
        const accuracy = activeModel?.accuracy != null ? ` (${(activeModel.accuracy * 100).toFixed(1)}%)` : '';

        sched.pendingRetrainSince = null;
        localStorage.setItem('ml-auto-retrain-scheduler', JSON.stringify(sched));

        addNotification({
          id: `auto-retrain-success-${todayStr}`,
          title: 'Auto-Retraining Completed',
          description: `Backend automatically retrained all 4 models using data up to ${monthLabel}. Active model: ${winnerLabel}${accuracy}. Next run: 10th of next month at 11:59 PM.`,
          timestamp: now.toISOString(),
        });
        addToast(`Auto-retraining done. Active: ${winnerLabel}`, 'success');
        await loadData();
      } else {
        // Backend hasn't finished yet — it will retry tomorrow night
        if (!sched.pendingRetrainSince) {
          sched.pendingRetrainSince = todayStr;
          localStorage.setItem('ml-auto-retrain-scheduler', JSON.stringify(sched));
        }

        addNotification({
          id: `auto-retrain-pending-${todayStr}`,
          title: 'Auto-Retraining Pending',
          description: `Scheduled retraining for ${monthLabel} has not completed yet (submission rate may be below 70%). The backend will retry automatically tomorrow at 11:59 PM.`,
          timestamp: now.toISOString(),
        });
      }
    } catch (err) {
      if (!sched.pendingRetrainSince) {
        sched.pendingRetrainSince = todayStr;
        localStorage.setItem('ml-auto-retrain-scheduler', JSON.stringify(sched));
      }
      addNotification({
        id: `auto-retrain-error-${todayStr}`,
        title: 'Auto-Retraining Check Failed',
        description: `Could not check retraining status: ${err instanceof Error ? err.message : 'Unknown error'}. Will check again tomorrow at 11:59 PM.`,
        timestamp: now.toISOString(),
      });
    }
  }, [autoRetrainingEnabled, addNotification, addToast, loadData, months]);

  // Run scheduler every minute; also evaluate on mount to catch a missed window
  useEffect(() => {
    runAutoRetrainCheck();
    const intervalId = setInterval(runAutoRetrainCheck, 60_000);
    return () => clearInterval(intervalId);
  }, [runAutoRetrainCheck]);

  const deriveAlertTitle = useCallback((alert: DriftAlert) => {
    if (alert.title && alert.title.trim()) return alert.title.trim();

    const messageLower = String(alert.message || '').toLowerCase();
    if (alert.alertType === 'drift' || messageLower.includes('drift')) return 'Drift Detected';
    if (messageLower.includes('disconnect')) return 'Disconnected';
    if (messageLower.includes('connect')) return 'Connected';
    return 'Problem Detected';
  }, []);

  const notificationItems = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20),
    [notifications]
  );

  const unreadNotifications = useMemo(
    () => notificationItems.filter((item) => !readNotificationIds.includes(item.id)),
    [notificationItems, readNotificationIds]
  );
  const latestForecast = useMemo(
    () => (forecasts.length > 0 ? forecasts[forecasts.length - 1] : null),
    [forecasts]
  );
  const tourismTrendForecasts = useMemo<DemandForecast[]>(() => {
    if (forecasts.length > 0) {
      const sorted = [...forecasts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Build a lookup of actual arrivals for 2026+ months from the dataset
      const actualLookup = new Map<string, number>();
      monthlyTourismData.forEach((row) => {
        if (row.year >= 2026 && row.arrivals > 0) {
          const key = `${row.year}-${String(row.month).padStart(2, '0')}`;
          actualLookup.set(key, row.arrivals);
        }
      });

      if (actualLookup.size === 0) return sorted;

      // Replace ml-f- entries with actual data where available so they appear in the actuals chart
      return sorted.map((entry) => {
        if (!String(entry.id || '').startsWith('ml-f-')) return entry;
        const d = new Date(entry.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const actual = actualLookup.get(key);
        if (actual === undefined) return entry;
        return {
          ...entry,
          id: entry.id.replace('ml-f-', 'ml-h-'),
          actualOccupancy: actual,
          accommodationType: 'Tourist Arrivals',
        };
      });
    }

    return [...monthlyTourismData]
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      })
      .map((row) => ({
        id: `monthly-${row.year}-${row.month}`,
        actualOccupancy: row.arrivals,
        predictedOccupancy: 0,
        error: 0,
        date: new Date(row.year, row.month - 1, 1).toISOString(),
        location: 'Tourism Dataset',
        accommodationType: 'All',
      }));
  }, [forecasts, monthlyTourismData]);

  const monthlyTouristTotals = useMemo(() => {
    if (monthlyTourismData.length > 0) {
      return monthlyTourismData.reduce<Record<string, { total: number }>>((acc, item) => {
        const key = `${item.year}-${item.month - 1}`;
        acc[key] = {
          total: item.arrivals,
        };
        return acc;
      }, {});
    }

    return forecasts.reduce<Record<string, { total: number }>>((acc, item) => {
      const date = new Date(item.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;

      if (!acc[key]) {
        acc[key] = { total: 0 };
      }

      acc[key].total += item.actualOccupancy;
      return acc;
    }, {});
  }, [forecasts, monthlyTourismData]);

  useEffect(() => {
    if (selectedDashboardDate) return;

    if (monthlyTourismData.length > 0) {
      const latestRow = [...monthlyTourismData].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      })[0];

      if (latestRow) {
        setSelectedDashboardDate(new Date(latestRow.year, latestRow.month - 1, 1));
        return;
      }
    }

    if (forecasts.length === 0) return;
    const latestDate = new Date(forecasts[forecasts.length - 1].date);
    setSelectedDashboardDate(new Date(latestDate.getFullYear(), latestDate.getMonth(), 1));
  }, [forecasts, monthlyTourismData, selectedDashboardDate]);

  const dashboardMonth = useMemo(() => {
    if (selectedDashboardDate) return selectedDashboardDate.getMonth();
    if (latestForecast) return new Date(latestForecast.date).getMonth();
    return new Date().getMonth();
  }, [selectedDashboardDate, latestForecast]);

  const dashboardYear = useMemo(() => {
    if (selectedDashboardDate) return selectedDashboardDate.getFullYear();
    if (latestForecast) return new Date(latestForecast.date).getFullYear();
    return new Date().getFullYear();
  }, [selectedDashboardDate, latestForecast]);

  const selectedDashboardData = useMemo(() => {
    return monthlyTouristTotals[`${dashboardYear}-${dashboardMonth}`] ?? null;
  }, [monthlyTouristTotals, dashboardYear, dashboardMonth]);

  const selectedMonthlyTourismRecord = useMemo(() => {
    return monthlyTourismData.find(
      (row) => row.year === dashboardYear && row.month === dashboardMonth + 1
    ) || null;
  }, [dashboardMonth, dashboardYear, monthlyTourismData]);

  const selectedCutoffMonthlyRecord = useMemo(() => {
    return monthlyTourismData.find(
      (row) => row.year === simulateYear && row.month === simulateMonth
    ) || null;
  }, [monthlyTourismData, simulateMonth, simulateYear]);

  const top10MarketHolidayForSelectedMonth = useMemo(() => {
    return top10MarketHolidayData
      .filter((row) => row.year === dashboardYear && row.month === dashboardMonth + 1)
      .sort((a, b) => a.rank - b.rank);
  }, [dashboardMonth, dashboardYear, top10MarketHolidayData]);

  const dashboardMonthLabel = useMemo(
    () => new Date(dashboardYear, dashboardMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' }),
    [dashboardYear, dashboardMonth]
  );

  useEffect(() => {
    if (!selectedCutoffMonthlyRecord) {
      setManualInflationRate('');
      setManualIsLockdown('no');
      return;
    }

    setManualInflationRate(
      selectedCutoffMonthlyRecord.inflationRate !== null && selectedCutoffMonthlyRecord.inflationRate !== undefined
        ? String(selectedCutoffMonthlyRecord.inflationRate)
        : ''
    );
    setManualIsLockdown(selectedCutoffMonthlyRecord.isLockdown ? 'yes' : 'no');
  }, [selectedCutoffMonthlyRecord]);

  useEffect(() => {
    // Years ≤ 2025 use the CSV dataset — data is fully available, so submission rate is 100%.
    // Years ≥ 2026 use the live Panglao ITDMS API with localStorage cache fallback.
    if (simulateYear <= 2025) {
      setSimulateCheckinsSubmission({ year: simulateYear, month: simulateMonth, totalCheckIns: 0, submissionRatePercentage: 100 });
      setSimulateCheckinsLoading(false);
      return;
    }

    const cacheKey = `ml-simulate-checkins-${simulateYear}-${simulateMonth}`;

    // Load cached value immediately so the UI is never blank
    let cachedData: CheckinsSubmissionData | null = null;
    try {
      cachedData = JSON.parse(localStorage.getItem(cacheKey) ?? 'null') as CheckinsSubmissionData | null;
    } catch { /* ignore */ }
    if (cachedData) {
      setSimulateCheckinsSubmission(cachedData);
    } else {
      setSimulateCheckinsSubmission(null);
    }

    let cancelled = false;
    setSimulateCheckinsLoading(true);
    getCheckinsSubmission(simulateYear, simulateMonth)
      .then((data) => {
        if (cancelled) return;
        // Persist to cache
        try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch { /* ignore */ }
        setSimulateCheckinsSubmission(data);
      })
      .catch(() => {
        // Keep showing cached value on network failure — already set above
      })
      .finally(() => { if (!cancelled) setSimulateCheckinsLoading(false); });
    return () => { cancelled = true; };
  }, [simulateYear, simulateMonth]);

  useEffect(() => {
    if (dashboardYear < 2026) {
      setFutureCheckinsSubmission(null);
      setPanglaoLatencyMs(null);
      return;
    }

    const syncFutureMonthFromPanglao = async () => {
      const monthNumber = dashboardMonth + 1;
      const dashCacheKey = `ml-dashboard-checkins-${dashboardYear}-${monthNumber}`;

      // Show cached value immediately while fetching
      try {
        const cached = JSON.parse(localStorage.getItem(dashCacheKey) ?? 'null') as CheckinsSubmissionData | null;
        if (cached) setFutureCheckinsSubmission(cached);
      } catch { /* ignore */ }

      try {
        const startedAt = performance.now();
        const data = await getCheckinsSubmission(dashboardYear, monthNumber);
        setPanglaoLatencyMs(Math.round(performance.now() - startedAt));
        setFutureCheckinsSubmission(data);
        try { localStorage.setItem(dashCacheKey, JSON.stringify(data)); } catch { /* ignore */ }
        // Keep legacy key in sync too
        try { localStorage.setItem('ml-future-checkins', JSON.stringify(data)); } catch { /* ignore */ }

        if (!Number.isFinite(Number(data.totalCheckIns)) || Number(data.totalCheckIns) <= 0) {
          return;
        }

        const existingRow = selectedMonthlyTourismRecord;
        const needsInsertOrUpdate = !existingRow || Number(existingRow.arrivals) !== Number(data.totalCheckIns);
        if (!needsInsertOrUpdate) return;

        await upsertMonthlyTourismDataset({
          year: dashboardYear,
          month: monthNumber,
          arrivals: data.totalCheckIns,
          inflationRate: existingRow?.inflationRate ?? null,
          isLockdown: existingRow?.isLockdown ?? false,
        });

        const refreshed = await getMonthlyTourismDataset();
        setMonthlyTourismData(refreshed);

        addNotification({
          id: `panglao-data-${dashboardYear}-${monthNumber}-${data.totalCheckIns}`,
          title: 'Panglao Data Added',
          description: `${months[monthNumber - 1]} ${dashboardYear} data was found in Panglao ITDMS API and added to the system.`,
          timestamp: new Date().toISOString(),
        });
      } catch {
        // On failure, keep the cached value already set above — just clear the latency indicator
        setPanglaoLatencyMs(null);
      }
    };

    syncFutureMonthFromPanglao();
  }, [addNotification, dashboardMonth, dashboardYear, selectedMonthlyTourismRecord]);

  // Sync Top-10 Market Holidays from Panglao ITDMS top-nationalities API
  // when no existing CSV data is found for the selected month/year.
  useEffect(() => {
    if (top10MarketHolidayForSelectedMonth.length > 0) {
      // Already have data — nothing to do
      return;
    }

    const syncTop10 = async () => {
      try {
        const startedAt = performance.now();
        const result = await syncTop10MarketHolidaysFromPanglao(dashboardYear, dashboardMonth + 1);
        setNationalitiesApiLatencyMs(Math.round(performance.now() - startedAt));

        if (result.records.length > 0) {
          // Refresh the global top10 data from backend so the new CSV rows are visible
          const refreshed = await getTop10MarketHolidays();
          setTop10MarketHolidayData(refreshed);

          addNotification({
            id: `top10-sync-${dashboardYear}-${dashboardMonth + 1}`,
            title: 'Top 10 Market Holidays Synced',
            description: `Holiday data for ${months[dashboardMonth]} ${dashboardYear} was fetched from Panglao ITDMS top-nationalities API and saved.`,
            timestamp: new Date().toISOString(),
          });
        }
      } catch {
        setNationalitiesApiLatencyMs(null);
      }
    };

    syncTop10();
  }, [addNotification, dashboardMonth, dashboardYear, months, top10MarketHolidayForSelectedMonth]);

  useEffect(() => {
    if (selectedMonthlyTourismRecord?.philippineHolidayCount !== null && selectedMonthlyTourismRecord?.philippineHolidayCount !== undefined) {
      setDashboardHolidayCountApi(selectedMonthlyTourismRecord.philippineHolidayCount);
      setHolidayLatencyMs(0);
      return;
    }

    // Strict mode: month/year navigation should never trigger Calendarific.
    setDashboardHolidayCountApi(null);
    setHolidayLatencyMs(null);
  }, [selectedMonthlyTourismRecord]);

  const bestModelUsed = useMemo(() => {
    return getModelLabel(selectedModel);
  }, [selectedModel]);
  const bestModelAccuracy = useMemo(() => {
    const active = trainedModels.find((model) => model.inUse);
    return typeof active?.accuracy === 'number' ? `${(active.accuracy * 100).toFixed(2)}%` : 'N/A';
  }, [trainedModels]);
  const submissionRate = useMemo(() => {
    if (dashboardYear >= 2026 && futureCheckinsSubmission) {
      return `${futureCheckinsSubmission.submissionRatePercentage.toFixed(2)}%`;
    }

    if (dataQuality) return `${dataQuality.completeness.toFixed(1)}%`;
    return 'N/A';
  }, [dashboardYear, dataQuality, futureCheckinsSubmission]);

  const selectedTotalTourists = useMemo(() => {
    if (dashboardYear >= 2026 && futureCheckinsSubmission) {
      return futureCheckinsSubmission.totalCheckIns;
    }

    return selectedDashboardData?.total ?? null;
  }, [dashboardYear, futureCheckinsSubmission, selectedDashboardData]);
  const currentMonthHolidayCount = useMemo(() => {
    if (selectedMonthlyTourismRecord?.philippineHolidayCount !== null && selectedMonthlyTourismRecord?.philippineHolidayCount !== undefined) {
      return selectedMonthlyTourismRecord.philippineHolidayCount;
    }

    if (dashboardHolidayCountApi !== null) {
      return dashboardHolidayCountApi;
    }

    return null;
  }, [dashboardHolidayCountApi, selectedMonthlyTourismRecord]);

  // Weather data fetched from Open-Meteo API
  const [weatherData, setWeatherData] = useState<MonthlyWeather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  useEffect(() => {
    setWeatherLoading(true);
    const startedAt = performance.now();
    fetchMonthlyWeather(dashboardYear, dashboardMonth)
      .then((data) => {
        setWeatherLatencyMs(Math.round(performance.now() - startedAt));
        setWeatherData(data);
      })
      .catch(() => {
        setWeatherLatencyMs(null);
        setWeatherData(null);
      })
      .finally(() => setWeatherLoading(false));
  }, [dashboardMonth, dashboardYear]);

  const monthHighTempC = selectedMonthlyTourismRecord?.avgHighTempC ?? weatherData?.avgHighTemp ?? null;
  const monthLowTempC = selectedMonthlyTourismRecord?.avgLowTempC ?? weatherData?.avgLowTemp ?? null;
  const monthPrecipitationCm = selectedMonthlyTourismRecord?.precipitationCm ?? weatherData?.totalPrecipitation ?? null;
  const inflationRateValue = selectedMonthlyTourismRecord?.inflationRate ?? 0;
  const isPeakSeason = useMemo(() => {
    if (selectedMonthlyTourismRecord?.isPeakSeason !== null && selectedMonthlyTourismRecord?.isPeakSeason !== undefined) {
      return selectedMonthlyTourismRecord.isPeakSeason;
    }

    const peakSeasonMonths = [7, 11];
    return peakSeasonMonths.includes(dashboardMonth);
  }, [dashboardMonth, selectedMonthlyTourismRecord]);
  const isDecember = useMemo(() => {
    if (selectedMonthlyTourismRecord?.isDecember !== null && selectedMonthlyTourismRecord?.isDecember !== undefined) {
      return selectedMonthlyTourismRecord.isDecember;
    }

    return dashboardMonth === 11;
  }, [dashboardMonth, selectedMonthlyTourismRecord]);
  const isLockdown = selectedMonthlyTourismRecord?.isLockdown ?? false;

  const nextMonthDate = useMemo(() => new Date(dashboardYear, dashboardMonth + 1, 1), [dashboardMonth, dashboardYear]);
  const nextMonthLabel = useMemo(
    () => nextMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
    [nextMonthDate]
  );
  const predictedNextMonthTotal = useMemo(() => {
    const targetYear = nextMonthDate.getFullYear();
    const targetMonth = nextMonthDate.getMonth();

    const candidates = tourismTrendForecasts.filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate.getFullYear() === targetYear && entryDate.getMonth() === targetMonth;
    });

    if (candidates.length === 0) return null;

    const forecastRows = candidates.filter((entry) =>
      String(entry.id || '').startsWith('ml-f-')
      || String(entry.accommodationType || '').toLowerCase().includes('forecast')
    );

    const sourceRows = forecastRows.length > 0 ? forecastRows : candidates;
    const predicted = sourceRows.reduce((sum, entry) => sum + (Number(entry.predictedOccupancy) || 0), 0);

    if (predicted > 0) return Math.round(predicted);

    const fallbackActual = sourceRows.reduce((sum, entry) => sum + (Number(entry.actualOccupancy) || 0), 0);
    return fallbackActual > 0 ? Math.round(fallbackActual) : null;
  }, [nextMonthDate, tourismTrendForecasts]);

  const top10MarketHolidayRows = useMemo(
    () => top10MarketHolidayForSelectedMonth.map((item) => ({ rank: item.rank, country: item.country, holidayCount: item.holidayCount })),
    [top10MarketHolidayForSelectedMonth]
  );

  const top10TotalHolidays = useMemo(() => {
    if (top10MarketHolidayForSelectedMonth.length === 0) return null;
    const csvTotal = top10MarketHolidayForSelectedMonth[0]?.totalHolidays;
    if (Number.isFinite(Number(csvTotal))) {
      return Number(csvTotal);
    }
    return top10MarketHolidayForSelectedMonth.reduce((sum, item) => sum + item.holidayCount, 0);
  }, [top10MarketHolidayForSelectedMonth]);

  const touristTrendParameters = useMemo<TouristTrendParameter[]>(() => {
    return [
      {
        label: 'Average High Temperature',
        value: weatherLoading ? 'Loading…' : (monthHighTempC !== null ? `${Number(monthHighTempC).toFixed(1)} °C` : 'N/A'),
      },
      {
        label: 'Average Low Temperature',
        value: weatherLoading ? 'Loading…' : (monthLowTempC !== null ? `${Number(monthLowTempC).toFixed(1)} °C` : 'N/A'),
      },
      {
        label: 'Top 10 Market Holidays',
        value: top10MarketHolidayRows.length > 0 ? '' : 'No Top10MH records for selected month',
        holidayRows: top10MarketHolidayRows,
        totalHolidays: top10TotalHolidays,
      },
      {
        label: 'Precipitation',
        value: weatherLoading ? 'Loading…' : (monthPrecipitationCm !== null ? `${Number(monthPrecipitationCm).toFixed(1)} cm` : 'N/A'),
      },
      {
        label: 'Inflation Rate',
        value: `${inflationRateValue.toFixed(2)}%`,
      },
      {
        label: 'Peak Season',
        value: isPeakSeason ? 'Yes' : 'No',
      },
      {
        label: 'is December?',
        value: isDecember ? 'Yes' : 'No',
      },
      {
        label: 'is Lockdown',
        value: isLockdown ? 'Yes' : 'No',
      },
      {
        label: 'Philippine Holidays',
        value: currentMonthHolidayCount !== null ? `${currentMonthHolidayCount} holidays` : 'N/A',
      },
    ];
  }, [
    currentMonthHolidayCount,
    inflationRateValue,
    isDecember,
    isLockdown,
    isPeakSeason,
    monthHighTempC,
    monthLowTempC,
    monthPrecipitationCm,
    top10MarketHolidayRows,
    top10TotalHolidays,
    weatherLoading,
  ]);

  const tabs: Array<{ id: string; label: string; icon: DashboardIconName }> = [
    { id: 'overview', label: 'Dashboard', icon: 'dashboard' },
    { id: 'metrics', label: 'Metrics', icon: 'metrics' },
    { id: 'retraining', label: 'Model Parameters', icon: 'retraining' },
  ];

  const navigationItems: Array<{ id: string; label: string; icon: DashboardIconName }> = [...tabs];
  const activeSectionLabel = activeTab === 'about'
    ? 'About the System'
    : navigationItems.find((item) => item.id === activeTab)?.label || 'Dashboard';

  const externalApiStatuses = useMemo(
    () => [
      {
        id: 'open-meteo',
        name: 'Open Meteo',
        usedFor: 'Fetches monthly average temperature (high/low) and precipitation used as weather features in the forecasting model.',
        status: weatherData?.source === 'api' ? 'active' : 'inactive',
        latencyMs: weatherLatencyMs,
      },
      {
        id: 'calendarific',
        name: 'Calendarific',
        usedFor: 'Fetches data for Philippines and countries on the Top 10 Market Holidays featuring national holiday counts per month.',
        status: dashboardHolidayCountApi !== null ? 'active' : 'inactive',
        latencyMs: holidayLatencyMs,
      },
      {
        id: 'panglao-itdms',
        name: 'Panglao ITDMS',
        usedFor: 'Fetches data on monthly tourist check-in totals, submission rates, and top visiting nationalities used to derive Top 10 Market Holiday features.',
        status: futureCheckinsSubmission !== null || nationalitiesApiLatencyMs !== null || top10MarketHolidayForSelectedMonth.length > 0 ? 'active' : 'inactive',
        latencyMs: panglaoLatencyMs ?? nationalitiesApiLatencyMs,
      },
    ],
    [dashboardHolidayCountApi, futureCheckinsSubmission, holidayLatencyMs, nationalitiesApiLatencyMs, panglaoLatencyMs, top10MarketHolidayForSelectedMonth.length, weatherData?.source, weatherLatencyMs]
  );

  useEffect(() => {
    const sortedAlerts = [...alerts].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    for (const alert of sortedAlerts) {
      if (knownAlertIdsRef.current.has(alert.id)) continue;
      knownAlertIdsRef.current.add(alert.id);

      if (alert.resolved) continue;
      addNotification({
        id: `alert-${alert.id}`,
        title: deriveAlertTitle(alert),
        description: alert.message,
        timestamp: alert.timestamp,
      });
    }
  }, [addNotification, alerts, deriveAlertTitle]);

  useEffect(() => {
    const previousStatuses = previousEndpointStatusRef.current;

    for (const endpoint of endpoints) {
      const previous = previousStatuses.get(endpoint.id);
      if (previous && previous !== endpoint.status) {
        const connected = endpoint.status === 'active';
        addNotification({
          id: `endpoint-${endpoint.id}-${endpoint.lastCheck}-${endpoint.status}`,
          title: connected ? 'Connected' : 'Disconnected',
          description: `${endpoint.name} is now ${connected ? 'connected' : 'disconnected'}.`,
          timestamp: endpoint.lastCheck || new Date().toISOString(),
        });
      }
      previousStatuses.set(endpoint.id, endpoint.status);
    }
  }, [addNotification, endpoints]);

  useEffect(() => {
    if (!isNotificationOpen || notificationItems.length === 0) return;
    setReadNotificationIds((prev) => {
      const next = Array.from(new Set([...prev, ...notificationItems.map((item) => item.id)]));
      localStorage.setItem('ml-read-notification-ids', JSON.stringify(next));
      return next;
    });
  }, [isNotificationOpen, notificationItems]);

  useEffect(() => {
    if (!isNotificationOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (notificationPanelRef.current?.contains(target)) return;
      if (target.closest('[data-notification-trigger="true"]')) return;

      setIsNotificationOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isNotificationOpen]);

  if (loading && metrics.length === 0) {
    return (
      <div className={`flex items-center justify-center h-screen ${isDarkMode ? 'dark' : ''}`}>
        <div className="text-center">
          <div className="animate-spin mb-4">⏳</div>
          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-slate-950' : 'bg-gray-50'}`}>
      <div className="w-full min-h-screen flex">
        <aside className={`hidden md:flex md:w-72 lg:w-80 shrink-0 flex-col border-r p-6 sticky top-0 h-screen ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Panglao Tourist Accommodation Demand Forecasting System</h1>
          </div>

          <nav className="space-y-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white shadow'
                    : isDarkMode
                    ? 'hover:bg-slate-800 text-white'
                    : 'hover:bg-gray-100 text-black'
                }`}
              >
                <span className="w-6 flex items-center justify-center">
                  <DashboardIcon name={item.icon} className="h-5 w-5" />
                </span>
                <span className="font-semibold whitespace-nowrap text-lg">
                  {item.label}
                </span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6">
            <div className="relative mb-4 flex items-center justify-around">
              {isNotificationOpen && (
                <div ref={notificationPanelRef} className={`absolute bottom-full left-0 mb-3 w-80 rounded-xl border shadow-xl z-20 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
                  <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">Notification</p>
                      <button
                        onClick={() => setIsNotificationOpen(false)}
                        className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-3 space-y-2">
                    {notificationItems.length > 0 ? notificationItems.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-lg border px-3 py-2 ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{item.title}</p>
                          {!readNotificationIds.includes(item.id) && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />}
                        </div>
                        <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.description}</p>
                        <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                    )) : (
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No notifications available</p>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsNotificationOpen((prev) => !prev)}
                title="Notification"
                data-notification-trigger="true"
                className={`relative p-3 rounded-lg transition border flex items-center justify-center ${
                  unreadNotifications.length > 0
                    ? 'bg-red-500 border-red-400 text-white hover:bg-red-600'
                    : isDarkMode
                    ? 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700'
                    : 'bg-white border-gray-300 text-black hover:bg-gray-100'
                }`}
              >
                <DashboardIcon name="notification" className="h-5 w-5" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[1.2rem] h-5 px-1 rounded-full bg-red-700 text-white text-[10px] flex items-center justify-center">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>

              <button
                onClick={toggleDarkMode}
                title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
                className={`p-3 rounded-lg transition border flex items-center justify-center ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700'
                    : 'bg-white border-gray-300 text-black hover:bg-gray-100'
                }`}
              >
                <DashboardIcon name={isDarkMode ? 'sun' : 'moon'} className="h-5 w-5" />
              </button>
              <button
                onClick={onSettingsClick}
                title="Settings"
                className={`p-3 rounded-lg transition border flex items-center justify-center ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700'
                    : 'bg-white border-gray-300 text-black hover:bg-gray-100'
                }`}
              >
                <DashboardIcon name="settings" className="h-5 w-5" />
              </button>
              <button
                onClick={() => setActiveTab('about')}
                title="About the System"
                className={`p-3 rounded-lg transition border flex items-center justify-center ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700'
                    : 'bg-white border-gray-300 text-black hover:bg-gray-100'
                }`}
              >
                <DashboardIcon name="info" className="h-5 w-5" />
              </button>
            </div>
            <div className={`w-full ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              <p className="text-xl font-bold w-full text-center">{currentDateTime.toLocaleDateString()}</p>
              <p className="text-xl font-bold w-full text-center">{currentDateTime.toLocaleTimeString()}</p>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className={`md:hidden px-4 py-4 border-b sticky top-0 z-10 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold">Panglao Tourist Accommodation Demand Forecasting System</h1>
              <p className="text-xs opacity-80">{currentDateTime.toLocaleTimeString()}</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-2 rounded-lg whitespace-nowrap text-base font-semibold flex items-center gap-2 ${
                    activeTab === item.id
                      ? 'bg-blue-600 text-white'
                      : isDarkMode
                      ? 'bg-slate-800 text-white'
                      : 'bg-gray-100 text-black'
                  }`}
                >
                  <DashboardIcon name={item.icon} className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              <button
                onClick={() => setIsNotificationOpen((prev) => !prev)}
                data-notification-trigger="true"
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  unreadNotifications.length > 0
                    ? 'bg-red-500 text-white'
                    : isDarkMode
                    ? 'bg-slate-800 text-white'
                    : 'bg-gray-100 text-black'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <DashboardIcon name="notification" className="h-4 w-4" />
                  Notification
                </span>
              </button>
              <button
                onClick={toggleDarkMode}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  isDarkMode ? 'bg-slate-800 text-white' : 'bg-gray-100 text-black'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <DashboardIcon name={isDarkMode ? 'sun' : 'moon'} className="h-4 w-4" />
                  {isDarkMode ? 'Light' : 'Dark'}
                </span>
              </button>
              <button
                onClick={onSettingsClick}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white"
              >
                <span className="flex items-center justify-center gap-2">
                  <DashboardIcon name="settings" className="h-4 w-4" />
                  Settings
                </span>
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  isDarkMode ? 'bg-slate-800 text-white' : 'bg-gray-100 text-black'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <DashboardIcon name="info" className="h-4 w-4" />
                  About
                </span>
              </button>
            </div>
          </div>

          <div className="px-4 md:px-8 xl:px-10 py-8">
            {activeTab !== 'metrics' && (
              <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-dark'}`}>{activeSectionLabel}</h2>
                {activeTab === 'overview' && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <select
                      value={dashboardMonth}
                      onChange={handleDashboardMonthChange}
                      className={`p-2 rounded border outline-none ${isDarkMode ? 'bg-slate-900 text-white border-slate-700' : 'bg-white border-gray-300'}`}
                    >
                      {months.map((month, i) => (
                        <option key={month} value={i}>{month}</option>
                      ))}
                    </select>
                    <select
                      value={dashboardYear}
                      onChange={handleDashboardYearChange}
                      className={`p-2 rounded border outline-none ${isDarkMode ? 'bg-slate-900 text-white border-slate-700' : 'bg-white border-gray-300'}`}
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Dashboard Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className={`rounded-lg border p-4 md:p-6 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                    <div className={`rounded-lg shadow p-4 border-l-4 border-sky-500 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{`Total Tourist of ${dashboardMonthLabel}`}</p>
                      <p className="text-3xl font-bold text-sky-500">
                        {selectedTotalTourists !== null ? Math.round(selectedTotalTourists).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div className={`rounded-lg shadow p-4 border-l-4 border-sky-500 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Submission Rate</p>
                      <p className="text-3xl font-bold text-sky-500">{submissionRate}</p>
                    </div>
                    <div className={`rounded-lg shadow p-4 border-l-4 border-sky-500 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{`Predicted Tourist Arrivals (${nextMonthLabel})`}</p>
                      <p className="text-3xl font-bold text-sky-500 break-words">
                        {predictedNextMonthTotal !== null ? predictedNextMonthTotal.toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div className={`rounded-lg shadow p-4 border-l-4 border-sky-500 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Best Model Used</p>
                      <p className="text-3xl font-bold text-sky-500">{bestModelUsed}</p>
                    </div>
                    <div className={`rounded-lg shadow p-4 border-l-4 border-sky-500 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Model Accuracy</p>
                      <p className="text-3xl font-bold text-sky-500">{bestModelAccuracy}</p>
                    </div>
                  </div>
                </div>

                <TouristForecastTrendChart
                  forecasts={tourismTrendForecasts}
                  monthsAhead={predictionHorizonMonths}
                  horizonSelectorValue={predictionHorizonMonths}
                  onHorizonSelectorChange={(value) => setPredictionHorizonMonths(value)}
                  centerTitle
                />

                <div className={`rounded-lg border p-4 md:p-6 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                  <div className={`${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                    <p className="text-xl md:text-2xl font-bold mb-3">Tourist Trends Data Parameters</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {touristTrendParameters.map((parameter) => {
                        const isTopMarketHoliday = parameter.label === 'Top 10 Market Holidays';

                        return (
                          <div
                            key={parameter.label}
                            className={`rounded-lg shadow p-4 border-l-4 border-sky-500 transition ${
                              isDarkMode
                                ? 'bg-slate-900 text-gray-100'
                                : 'bg-white text-gray-700'
                            } ${isTopMarketHoliday ? 'xl:row-span-4' : ''}`}
                          >
                            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{parameter.label}</p>
                            {isTopMarketHoliday && parameter.holidayRows && parameter.holidayRows.length > 0 ? (
                              <div className="mt-3 space-y-1.5 max-h-[22rem] overflow-auto pr-1">
                                {parameter.holidayRows.map((row) => (
                                  <div key={row.country} className="flex items-center justify-between gap-3 text-lg text-sky-500 leading-6">
                                    <span className="font-semibold text-left flex items-center gap-1.5">
                                      <span className={`text-xs w-5 text-center font-bold shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>{row.rank}.</span>
                                      {row.country}
                                    </span>
                                    <span className="font-semibold text-right whitespace-nowrap">
                                      {row.holidayCount} {row.holidayCount === 1 ? 'holiday' : 'holidays'}
                                    </span>
                                  </div>
                                ))}
                                {parameter.totalHolidays !== null && parameter.totalHolidays !== undefined && (
                                  <div className="mt-2 border-t border-sky-300/40 pt-2 flex items-center justify-between gap-3 text-lg text-sky-500 leading-6">
                                    <span className="font-semibold text-left"> Total holidays</span>
                                    <span className="font-semibold text-right whitespace-nowrap">{parameter.totalHolidays}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className={`mt-2 text-sky-500 ${isTopMarketHoliday ? 'text-3xl font-bold leading-10' : 'text-3xl font-bold'}`}>
                                {parameter.value}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Metrics Tab */}
            {activeTab === 'metrics' && (
              <div className={`space-y-6 rounded-lg p-6 ${isDarkMode ? 'bg-slate-800 text-white border border-slate-700' : 'bg-white border'}`}>
                <MonthlyTouristArrivalsDataChart
                  forecasts={tourismTrendForecasts}
                  year={chartViewYear}
                  years={years}
                  onYearChange={(year) => {
                    setChartViewYear(year);
                    if (year === 0) return;
                    setSelectedDashboardDate((prev) => {
                      const base = prev ?? new Date();
                      return new Date(year, base.getMonth(), 1);
                    });
                  }}
                />
                <TouristForecastTrendChart
                  forecasts={tourismTrendForecasts}
                  monthsAhead={predictionHorizonMonths}
                  centerTitle
                  horizonSelectorValue={predictionHorizonMonths}
                  onHorizonSelectorChange={(value) => setPredictionHorizonMonths(value)}
                />
                {/* Forecasting Model Performance Table */}
                <div className={`rounded-lg border overflow-hidden ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                  <p className={`text-xl font-bold px-4 py-3 border-b ${isDarkMode ? 'text-gray-100 border-slate-700 bg-slate-900' : 'text-gray-800 border-gray-200 bg-gray-50'}`}>
                    Forecasting Model Performance
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={isDarkMode ? 'bg-slate-700 text-gray-200' : 'bg-gray-100 text-gray-700'}>
                          <th className="px-4 py-3 text-left font-semibold">Month / Year</th>
                          <th className="px-4 py-3 text-center font-semibold">XGBoost</th>
                          <th className="px-4 py-3 text-center font-semibold">LSTM</th>
                          <th className="px-4 py-3 text-center font-semibold">Random Forest</th>
                          <th className="px-4 py-3 text-center font-semibold">Prophet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecastPerformanceTable.length === 0 ? (
                          <tr>
                            <td colSpan={5} className={`px-4 py-6 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              No model data available from December 2025 onwards
                            </td>
                          </tr>
                        ) : (
                          forecastPerformanceTable.map(({ year, month, xgboost, lstm, random_forest, prophet }, idx) => {
                            const monthLabel = MONTH_NAMES_LONG[month - 1]
                              ? MONTH_NAMES_LONG[month - 1].charAt(0).toUpperCase() + MONTH_NAMES_LONG[month - 1].slice(1)
                              : String(month);
                            const modelEntries = [
                              { key: 'xgboost', data: xgboost },
                              { key: 'lstm', data: lstm },
                              { key: 'random_forest', data: random_forest },
                              { key: 'prophet', data: prophet },
                            ] as const;
                            return (
                              <tr
                                key={`${year}-${month}`}
                                className={idx % 2 === 0
                                  ? (isDarkMode ? 'bg-slate-800' : 'bg-white')
                                  : (isDarkMode ? 'bg-slate-750' : 'bg-gray-50')
                                }
                              >
                                <td className={`px-4 py-3 font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                  {monthLabel} {year}
                                </td>
                                {modelEntries.map(({ key, data }) => (
                                  <td key={key} className="px-4 py-3 text-center">
                                    {data.accuracy !== null ? (
                                      <span className={`inline-block px-2 py-0.5 rounded text-sm font-semibold ${
                                        data.inUse
                                          ? 'bg-green-100 text-green-800 ring-1 ring-green-500'
                                          : (isDarkMode ? 'text-gray-200' : 'text-gray-700')
                                      }`}>
                                        {data.accuracy.toFixed(2)}%
                                        {data.inUse && <span className="ml-1 text-xs font-normal">●</span>}
                                      </span>
                                    ) : (
                                      <span className={isDarkMode ? 'text-gray-600' : 'text-gray-400'}>—</span>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  {forecastPerformanceTable.some((r) => r.xgboost.inUse || r.lstm.inUse || r.random_forest.inUse || r.prophet.inUse) && (
                    <p className={`px-4 py-2 text-xs border-t ${isDarkMode ? 'text-gray-400 border-slate-700' : 'text-gray-500 border-gray-200'}`}>
                      ● = Currently active model
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Retraining Tab */}
            {activeTab === 'retraining' && (
              <div className="space-y-8">
                <div className={`rounded-lg border p-4 md:p-6 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                  <h2 className="text-2xl font-bold mb-4">Machine Learning Models</h2>
                  <div className={`rounded-lg border p-4 mb-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Forecast Model Accuracy</p>
                      <div className="flex items-center gap-2">
                        <select
                          value={accuracyViewMonth}
                          onChange={(e) => setAccuracyViewMonth(Number(e.target.value))}
                          className={`text-xs rounded border px-2 py-1 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                        >
                          {accuracyMonthOptions.map(({ year, month }) => (
                            <option key={`${year}-${month}`} value={month} data-year={year}
                              style={{ display: year === accuracyViewYear ? 'block' : 'none' }}>
                              {['January','February','March','April','May','June','July','August','September','October','November','December'][month - 1]}
                            </option>
                          ))}
                        </select>
                        <select
                          value={accuracyViewYear}
                          onChange={(e) => {
                            const newYear = Number(e.target.value);
                            setAccuracyViewYear(newYear);
                            const validMonths = accuracyMonthOptions.filter(o => o.year === newYear).map(o => o.month);
                            if (!validMonths.includes(accuracyViewMonth)) setAccuracyViewMonth(validMonths[validMonths.length - 1] ?? 12);
                          }}
                          className={`text-xs rounded border px-2 py-1 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                        >
                          {Array.from(new Set(accuracyMonthOptions.map(o => o.year))).map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                      {(['xgboost', 'lstm', 'random_forest', 'prophet'] as const).map((id) => {
                        const acc = selectedAccuracyByModel[id];
                        const label = getModelLabel(id);
                        const hasData = acc !== null;
                        const activeModel = trainedModels.find((m) => m.inUse);
                        const activeType = activeModel ? (() => {
                          const p = activeModel.modelName.toLowerCase();
                          return p.startsWith('lstm') ? 'lstm'
                            : p.startsWith('random_forest') ? 'random_forest'
                            : p.startsWith('prophet') ? 'prophet'
                            : 'xgboost';
                        })() : null;
                        const isActive = id === activeType;
                        return (
                          <div
                            key={id}
                            className={`rounded-lg border p-3 ${
                              isActive
                                ? isDarkMode ? 'border-green-600 bg-slate-900' : 'border-green-400 bg-white'
                                : isDarkMode ? 'border-slate-600 bg-slate-900' : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <p className="font-semibold text-sm leading-tight">{label}</p>
                              {isActive && (
                                <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full font-semibold ${isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'}`}>
                                  Active
                                </span>
                              )}
                            </div>
                            <p className={`text-2xl font-bold mt-2 ${hasData ? (isActive ? 'text-green-500' : 'text-sky-500') : isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              {hasData ? `${((acc ?? 0) * 100).toFixed(2)}%` : '—'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-3">
                    {/* Model Retraining */}
                    {(() => {
                      const sortedModels = [...trainedModels].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                      const lastRetrainedModel = sortedModels[0] ?? null;
                      const lastRetrainDate = lastRetrainedModel ? new Date(lastRetrainedModel.createdAt) : null;
                      // Next scheduled:
                      // - If in pending-retry mode: tomorrow at 23:59
                      // - Otherwise: 10th of current month if not yet passed, else 10th of next month
                      const nextScheduled = (() => {
                        const now = new Date();
                        if (schedulerStateRef.current.pendingRetrainSince) {
                          const tonight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0);
                          return tonight;
                        }
                        const thisMonth10 = new Date(now.getFullYear(), now.getMonth(), 10, 23, 59, 0);
                        return now < thisMonth10
                          ? thisMonth10
                          : new Date(now.getFullYear(), now.getMonth() + 1, 10, 23, 59, 0);
                      })();
                      const pendingRetrainSince = schedulerStateRef.current.pendingRetrainSince;
                      const formatDate = (d: Date) =>
                        d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                      return (
                        <div className={`rounded-lg border p-4 flex flex-col gap-2 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                          {/* Header */}
                          <div className="flex items-center gap-2">
                            <svg className="h-5 w-5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M21 2v6h-6" />
                              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                              <path d="M3 22v-6h6" />
                              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                            </svg>
                            <h3 className="text-lg font-semibold">Model Retraining</h3>
                          </div>

                          {/* Automated Retraining toggle */}
                          <div className={`flex items-center justify-between rounded-lg p-3 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                            <div>
                              <p className="font-semibold text-sm">Automated Retraining</p>
                            </div>
                            <button
                              onClick={() => setAutoRetrainingEnabled(prev => !prev)}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                                autoRetrainingEnabled
                                  ? isDarkMode ? 'bg-slate-900 text-white hover:bg-slate-950' : 'bg-gray-900 text-white hover:bg-black'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {autoRetrainingEnabled ? (
                                <>
                                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <rect x="6" y="5" width="4" height="14" rx="1" />
                                    <rect x="14" y="5" width="4" height="14" rx="1" />
                                  </svg>
                                  Disable
                                </>
                              ) : (
                                <>
                                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                  </svg>
                                  Enable
                                </>
                              )}
                            </button>
                          </div>

                          {/* Last Retrain / Next Scheduled */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className={`rounded-lg p-3 border ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                              <p className={`text-xs ${isDarkMode ? 'text-sky-400' : 'text-sky-600'}`}>Last Retrain</p>
                              <p className="mt-1 font-bold text-sm">
                                {lastRetrainDate ? formatDate(lastRetrainDate) : '—'}
                              </p>
                            </div>
                            <div className={`rounded-lg p-3 border ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                              <p className={`text-xs ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>Next Scheduled</p>
                              <p className="mt-1 font-bold text-sm">
                                {autoRetrainingEnabled ? formatDate(nextScheduled) : '—'}
                              </p>
                            </div>
                          </div>

                          {/* Pending retry banner */}
                          {autoRetrainingEnabled && pendingRetrainSince && (
                            <div className={`rounded-lg p-3 border flex items-start gap-2 ${isDarkMode ? 'bg-amber-950 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-800'}`}>
                              <svg className="h-4 w-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                              </svg>
                              <p className="text-xs">Submission rate was below 70% on <strong>{pendingRetrainSince}</strong>. Retrying daily at 11:59 PM until threshold is met.</p>
                            </div>
                          )}

                          {/* Selected month stats — Total Tourists + Submission Rate */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className={`rounded-lg p-3 border ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                              <p className={`text-xs ${isDarkMode ? 'text-sky-400' : 'text-sky-600'}`}>Total Tourists</p>
                              <p className="mt-1 font-bold text-sm">
                                {selectedCutoffMonthlyRecord
                                  ? selectedCutoffMonthlyRecord.arrivals.toLocaleString()
                                  : <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No data</span>}
                              </p>
                              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{months[simulateMonth - 1]} {simulateYear}</p>
                            </div>
                            <div className={`rounded-lg p-3 border ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                              <p className={`text-xs ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>Submission Rate</p>
                              <p className="mt-1 font-bold text-sm">
                                {simulateCheckinsLoading && !simulateCheckinsSubmission
                                  ? <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Loading…</span>
                                  : simulateCheckinsSubmission
                                    ? `${simulateCheckinsSubmission.submissionRatePercentage.toFixed(2)}%`
                                    : <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>—</span>}
                              </p>
                              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{months[simulateMonth - 1]} {simulateYear}</p>
                            </div>
                          </div>

                          {/* Training Parameters — Month / Year / Inflation / Lockdown */}
                          <div className={`rounded-lg border p-3 ${isDarkMode ? 'border-slate-600 bg-slate-700' : 'border-gray-200 bg-gray-50'}`}>
                            <p className={`text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Training Parameters</p>
                            <div className="grid grid-cols-4 gap-2">
                              <div>
                                <label className={`block text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Month</label>
                                <select
                                  value={simulateMonth}
                                  onChange={(e) => setSimulateMonth(Number(e.target.value))}
                                  className={`w-full text-xs rounded border px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                >
                                  {months.map((m, i) => {
                                    if (simulateYear === 2025 && i + 1 !== 12) return null;
                                    return <option key={i + 1} value={i + 1}>{m}</option>;
                                  })}
                                </select>
                              </div>
                              <div>
                                <label className={`block text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Year</label>
                                <select
                                  value={simulateYear}
                                  onChange={(e) => {
                                    const y = Number(e.target.value);
                                    setSimulateYear(y);
                                    if (y === 2025) setSimulateMonth(12);
                                  }}
                                  className={`w-full text-xs rounded border px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                >
                                  {trainingYears.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className={`block text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Inflation Rate (%)</label>
                                <input
                                  type="number"
                                  value={manualInflationRate}
                                  onChange={(e) => setManualInflationRate(e.target.value)}
                                  placeholder="e.g. 3.5"
                                  step="0.01"
                                  className={`w-full text-xs rounded border px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                                />
                              </div>
                              <div>
                                <label className={`block text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Lockdown Period</label>
                                <select
                                  value={manualIsLockdown}
                                  onChange={(e) => setManualIsLockdown(e.target.value as 'yes' | 'no')}
                                  className={`w-full text-xs rounded border px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                >
                                  <option value="no">No</option>
                                  <option value="yes">Yes</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Manual Retrain */}
                          <button
                            onClick={handleSimulateMonthlyRetraining}
                            disabled={isSimulating}
                            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border font-semibold text-sm transition-colors disabled:opacity-60 ${isDarkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-300 hover:bg-gray-50'}`}
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M21 2v6h-6" />
                              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                              <path d="M3 22v-6h6" />
                              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                            </svg>
                            {isSimulating ? 'Training...' : 'Manual Retrain'}
                          </button>
                        </div>
                      );
                    })()}

                    {/* Trained Model Logs */}
                    <div className={`rounded-lg border p-4 flex flex-col ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                      <div className="mb-3 shrink-0">
                        <h3 className="text-lg font-semibold">Trained Model Logs</h3>
                      </div>
                      <div className="overflow-x-auto overflow-y-auto max-h-96">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className={isDarkMode ? 'border-b border-slate-700 text-gray-300' : 'border-b border-gray-200 text-gray-600'}>
                              <th className={`sticky top-0 text-left py-2 pr-3 z-10 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>Model Name</th>
                              <th className={`sticky top-0 text-left py-2 pr-3 z-10 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>Date Created</th>
                              <th className={`sticky top-0 text-left py-2 pr-3 z-10 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>Accuracy</th>
                              <th className={`sticky top-0 text-left py-2 z-10 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>Trigger</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trainedModels.map((model) => (
                              <tr key={model.id} className={isDarkMode ? 'border-b border-slate-800' : 'border-b border-gray-100'}>
                                <td className="py-2 pr-3 font-medium">{formatModelVersion(model.modelName)}</td>
                                <td className="py-2 pr-3">{new Date(model.createdAt).toLocaleString()}</td>
                                <td className="py-2 pr-3">{typeof model.accuracy === 'number' ? `${(model.accuracy * 100).toFixed(2)}%` : '—'}</td>
                                <td className="py-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    model.triggerType === 'auto'
                                      ? (isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700')
                                      : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')
                                  }`}>
                                    {model.triggerType === 'auto' ? 'Auto' : 'Manual'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {trainedModels.length === 0 && (
                        <p className={`mt-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          No trained XGBoost models found yet. Run training first.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`rounded-lg border p-4 md:p-6 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                  <h2 className="text-2xl font-bold mb-4">API Status</h2>
                  <div className={`rounded-lg border p-4 ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={isDarkMode ? 'border-b border-slate-700 text-gray-300' : 'border-b border-gray-200 text-gray-600'}>
                            <th className="text-left py-2 pr-3">API</th>
                            <th className="text-left py-2 pr-3">Used For</th>
                            <th className="text-left py-2 pr-3">Latency</th>
                            <th className="text-left py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {externalApiStatuses.map((api) => (
                            <tr key={api.id} className={isDarkMode ? 'border-b border-slate-800' : 'border-b border-gray-100'}>
                              <td className="py-2 pr-3 font-medium">{api.name}</td>
                              <td className="py-2 pr-3">{api.usedFor}</td>
                              <td className="py-2 pr-3">{api.latencyMs !== null && api.latencyMs !== undefined ? `${api.latencyMs} ms` : 'N/A'}</td>
                              <td className="py-2">
                                <span className="inline-flex items-center gap-2 text-sm">
                                  <span className={`h-2.5 w-2.5 rounded-full ${api.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                                  <span>{api.status === 'active' ? 'Connected' : 'Disconnected'}</span>
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* About the System Tab */}
            {activeTab === 'about' && (
              <div className={`space-y-8 rounded-lg p-6 ${isDarkMode ? 'bg-slate-800 text-white border border-slate-700' : 'bg-white border'}`}>

                {/* Header */}
                <div>
                  <h3 className="text-2xl font-bold mb-3">Panglao Tourist Accommodation Demand Forecasting System</h3>
                  <p className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'} leading-relaxed`}>
                    This system is an intelligent, data-driven platform designed to forecast future tourist accommodation demand in Panglao, Bohol. It integrates historical tourism arrival data with real-time external factors — including weather conditions, inflation rates, and holiday calendars — to generate monthly predictions using multiple machine learning models. The system is built to continuously improve over time through automated model retraining, giving local tourism stakeholders a reliable tool for strategic planning, resource allocation, and operational decision-making.
                  </p>
                </div>

                {/* Key Feature Cards */}
                <div>
                  <h4 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Key Features</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`rounded-lg p-5 border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                      <p className={`font-semibold text-base mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Demand Forecasting</p>
                      <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm leading-relaxed`}>
                        Generates monthly tourist arrival forecasts for up to 12 months ahead using the best-performing trained model. Predictions are displayed alongside historical actuals so you can visually assess accuracy at a glance.
                      </p>
                    </div>
                    <div className={`rounded-lg p-5 border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                      <p className={`font-semibold text-base mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Multi-Model Comparison</p>
                      <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm leading-relaxed`}>
                        Trains and evaluates four machine learning models every month — XGBoost, LSTM, Random Forest, and Prophet — then automatically activates the highest-accuracy model as the active forecaster.
                      </p>
                    </div>
                    <div className={`rounded-lg p-5 border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                      <p className={`font-semibold text-base mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Performance Monitoring</p>
                      <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm leading-relaxed`}>
                        Tracks model accuracy over time in the Metrics tab. The Forecasting Model Performance table shows each model's accuracy for every recorded month, making it easy to spot improvements or degradations across retraining cycles.
                      </p>
                    </div>
                    <div className={`rounded-lg p-5 border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                      <p className={`font-semibold text-base mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Decision Support</p>
                      <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm leading-relaxed`}>
                        Equips tourism administrators and accommodation operators with forward-looking data to optimize staffing, pricing, and resource allocation for both peak and off-peak seasons.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Retraining Model Feature */}
                <div className={`rounded-lg border-l-4 border-blue-500 p-5 ${isDarkMode ? 'bg-slate-900 border border-slate-700' : 'bg-blue-50 border border-blue-100'}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <svg className="h-6 w-6 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <h4 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Retraining Model Feature</h4>
                  </div>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-sm leading-relaxed mb-4`}>
                    The system automatically retrains all four forecasting models each month using the latest available tourist arrival data. This ensures that predictions remain accurate as new real-world patterns emerge over time. The retraining process works as follows:
                  </p>
                  <ol className={`list-decimal list-inside space-y-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-4`}>
                    <li>At the end of each month, the system checks whether new tourist arrival data has been submitted for that month.</li>
                    <li>If actual data exists, all four models — XGBoost, LSTM, Random Forest, and Prophet — are retrained using the full updated dataset.</li>
                    <li>After training, the model with the highest accuracy is automatically activated as the live forecasting model.</li>
                    <li>If no data exists for the target month, retraining is cancelled and an error is shown to prevent training on empty records.</li>
                  </ol>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-sm leading-relaxed mb-4`}>
                    You can also manually trigger retraining at any time using the <strong>Retrain Models</strong> button in the <strong>Model Parameters</strong> tab. Manual retraining follows the same data validation — it will only proceed if actual arrival data exists for the selected month and year.
                  </p>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${isDarkMode ? 'bg-blue-900/40 text-blue-300 border border-blue-700' : 'bg-blue-100 text-blue-800 border border-blue-300'}`}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    To retrain manually, go to the <strong className="mx-1">Model Parameters</strong> tab and click the <strong className="mx-1">Retrain Models</strong> button.
                  </div>
                </div>

                {/* Real-time External Data */}
                <div className={`rounded-lg border-l-4 border-emerald-500 p-5 ${isDarkMode ? 'bg-slate-900 border border-slate-700' : 'bg-emerald-50 border border-emerald-100'}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <svg className="h-6 w-6 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                    </svg>
                    <h4 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Real-time External Data</h4>
                  </div>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-sm leading-relaxed mb-4`}>
                    Accurate demand forecasting requires more than historical arrivals alone. The system automatically fetches and incorporates the following external data sources in real time to enrich each prediction:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <div className={`rounded-lg p-4 border ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-emerald-200'}`}>
                      <p className={`font-semibold text-sm mb-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Open-Meteo</p>
                      <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Supplies monthly average high and low temperatures (°C) and average precipitation (cm) for Panglao. Weather is a strong seasonal driver of tourist arrivals.
                      </p>
                    </div>
                    <div className={`rounded-lg p-4 border ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-emerald-200'}`}>
                      <p className={`font-semibold text-sm mb-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Calendarific</p>
                      <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Provides the count of Philippine public holidays per month and holiday counts for the top 10 tourist-origin markets. Holiday periods significantly influence travel behavior.
                      </p>
                    </div>
                    <div className={`rounded-lg p-4 border ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-emerald-200'}`}>
                      <p className={`font-semibold text-sm mb-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Inflation Rate</p>
                      <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Monthly Philippine inflation data is incorporated as an economic indicator, reflecting the impact of consumer purchasing power on domestic and international travel demand.
                      </p>
                    </div>
                  </div>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-sm leading-relaxed mb-4`}>
                    These external signals are automatically resolved each time a forecast is generated or a model is retrained. The connection status of each external API can be monitored in the <strong>Model Parameters</strong> tab under the <strong>API Status</strong> section.
                  </p>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${isDarkMode ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'}`}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    To view API connection status, go to the <strong className="mx-1">Model Parameters</strong> tab and scroll to the <strong className="mx-1">API Status</strong> section.
                  </div>
                </div>

                {/* How to Use */}
                <div>
                  <h4 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>How to Use This System</h4>
                  <ol className={`space-y-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <li className="flex gap-3">
                      <span className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${isDarkMode ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white'}`}>1</span>
                      <span><strong>Dashboard tab</strong> — Monitor next-month occupancy forecasts, tourist trend charts, and current external parameter values (weather, holidays, inflation).</span>
                    </li>
                    <li className="flex gap-3">
                      <span className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${isDarkMode ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white'}`}>2</span>
                      <span><strong>Metrics tab</strong> — Review historical vs. predicted tourist arrival charts and the Forecasting Model Performance table to evaluate all models across months.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${isDarkMode ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white'}`}>3</span>
                      <span><strong>Model Parameters tab</strong> — Submit monthly tourist arrival data, manually trigger model retraining, review trained model logs, and check external API connectivity.</span>
                    </li>
                  </ol>
                </div>

              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};