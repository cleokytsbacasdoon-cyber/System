import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { RetrainingJobCard } from '../components/RetrainingJobCard';
import { MetricsChart } from '../components/MetricsChart';
import { PerformanceChart } from '../components/PerformanceChart';
import { RetrainingStats } from '../components/RetrainingStats';
import { DataExport } from '../components/DataExport';
import { TouristForecastTrendChart } from '../components/TouristForecastTrendChart';
import { 
  getModelMetrics, 
  getDriftAlerts, 
  getRetrainingJobs, 
  getAPIEndpoints,
  getDemandForecasts,
  getDataQuality,
  startRetrainingJob,
  checkEndpointStatus 
} from '../services/api';
import { fetchMonthlyWeather, MonthlyWeather } from '../services/weatherService';
import { useToast } from '../contexts/ToastContext';
import { ModelMetrics, DriftAlert, RetrainingJob, APIEndpoint, DemandForecast, DataQuality } from '../types';

interface DashboardProps {
  onSettingsClick: () => void;
}

interface TouristTrendParameter {
  label: string;
  value: string;
  endpointName?: string;
  endpointId?: string;
  statusLabel: string;
  note?: string;
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
  const [jobs, setJobs] = useState<RetrainingJob[]>([]);
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
  const [forecasts, setForecasts] = useState<DemandForecast[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQuality | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [predictedMonthsToShow, setPredictedMonthsToShow] = useState<3 | 6 | 12>(3);
  const [selectedApiParameter, setSelectedApiParameter] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDashboardDate, setSelectedDashboardDate] = useState<Date | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [readAlertIds, setReadAlertIds] = useState<string[]>([]);
  const [inflationRateInput, setInflationRateInput] = useState('3.2');
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const years = Array.from({ length: 2030 - 2016 + 1 }, (_, i) => 2016 + i);

  useEffect(() => {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      setRefreshInterval(settings.refreshInterval);
    }
  }, []);

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(clockTimer);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [metricsData, alertsData, jobsData, endpointsData, forecastsData, qualityData] = await Promise.all([
        getModelMetrics(),
        getDriftAlerts(),
        getRetrainingJobs(),
        getAPIEndpoints(),
        getDemandForecasts(),
        getDataQuality(),
      ]);
      setMetrics(metricsData);
      setAlerts(alertsData);
      setJobs(jobsData);
      setEndpoints(endpointsData);
      setForecasts(forecastsData);
      setDataQuality(qualityData);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [loadData, refreshInterval]);

  const getPHHoliday = (day: number, month: number, year: number) => {
    const holidayMap: { [key: string]: string } = {
      '0-1': "New Year's Day",
      '0-2': 'Special Non-Working Day',
      '1-25': 'EDSA Revolution Anniversary',
      '3-9': 'Araw ng Kagitingan',
      '4-1': 'Labor Day',
      '5-12': 'Independence Day',
      '7-21': 'Ninoy Aquino Day',
      '7-25': 'National Heroes Day',
      '10-1': "All Saints' Day",
      '10-2': "All Souls' Day",
      '10-30': 'Bonifacio Day',
      '11-8': 'Immaculate Conception',
      '11-24': 'Christmas Eve',
      '11-25': 'Christmas Day',
      '11-30': 'Rizal Day',
      '11-31': "New Year's Eve",
    };

    const moveable: { [key: string]: string } = {};
    if (year === 2024) {
      if (month === 2 && day === 28) moveable[`${month}-${day}`] = 'Maundy Thursday';
      if (month === 2 && day === 29) moveable[`${month}-${day}`] = 'Good Friday';
    } else if (year === 2025) {
      if (month === 3 && day === 17) moveable[`${month}-${day}`] = 'Maundy Thursday';
      if (month === 3 && day === 18) moveable[`${month}-${day}`] = 'Good Friday';
    } else if (year === 2026) {
      if (month === 3 && day === 2) moveable[`${month}-${day}`] = 'Maundy Thursday';
      if (month === 3 && day === 3) moveable[`${month}-${day}`] = 'Good Friday';
      if (month === 3 && day === 4) moveable[`${month}-${day}`] = 'Black Saturday';
    } else if (year === 2027) {
      if (month === 2 && day === 25) moveable[`${month}-${day}`] = 'Maundy Thursday';
      if (month === 2 && day === 26) moveable[`${month}-${day}`] = 'Good Friday';
    }

    return moveable[`${month}-${day}`] || holidayMap[`${month}-${day}`] || null;
  };

  const handleStartRetraining = async (modelId: string) => {
    try {
      const newJob = await startRetrainingJob(modelId);
      setJobs([newJob, ...jobs]);
      addToast('Retraining job started', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to start retraining', 'error');
    }
  };

  const handleCheckEndpoint = async (endpointId: string, options?: { silentSuccess?: boolean }) => {
    try {
      const updatedEndpoint = await checkEndpointStatus(endpointId);
      setEndpoints(prev => prev.map(e => e.id === endpointId ? updatedEndpoint : e));
      if (!options?.silentSuccess) {
        addToast('Endpoint checked', 'success');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to check endpoint', 'error');
    }
  };

  const handleApiParameterAction = async (parameter: string, endpointId?: string) => {
    setSelectedApiParameter(parameter);
    if (!endpointId) {
      addToast(`No endpoint mapped for ${parameter}`, 'error');
      return;
    }

    await handleCheckEndpoint(endpointId, { silentSuccess: true });
    addToast(`${parameter} checked via endpoint monitor`, 'success');
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(parseInt(e.target.value, 10));
    setViewDate(newDate);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(viewDate);
    newDate.setFullYear(parseInt(e.target.value, 10));
    setViewDate(newDate);
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

  const latestMetric = useMemo(() => metrics.length > 0 ? metrics[0] : null, [metrics]);
  const latestThreeAlerts = useMemo(
    () => [...alerts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 3),
    [alerts]
  );
  const unreadNotifications = useMemo(
    () => latestThreeAlerts.filter((alert) => !readAlertIds.includes(alert.id)),
    [latestThreeAlerts, readAlertIds]
  );
  const latestForecast = useMemo(
    () => (forecasts.length > 0 ? forecasts[forecasts.length - 1] : null),
    [forecasts]
  );
  const monthlyForecastMap = useMemo(() => {
    return forecasts.reduce<Record<string, { actualTotal: number; predictedTotal: number }>>((acc, item) => {
      const date = new Date(item.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;

      if (!acc[key]) {
        acc[key] = { actualTotal: 0, predictedTotal: 0 };
      }

      acc[key].actualTotal += item.actualOccupancy;
      acc[key].predictedTotal += item.predictedOccupancy;
      return acc;
    }, {});
  }, [forecasts]);

  useEffect(() => {
    if (selectedDashboardDate || forecasts.length === 0) return;
    const latestDate = new Date(forecasts[forecasts.length - 1].date);
    setSelectedDashboardDate(new Date(latestDate.getFullYear(), latestDate.getMonth(), 1));
  }, [forecasts, selectedDashboardDate]);

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
    return monthlyForecastMap[`${dashboardYear}-${dashboardMonth}`] ?? null;
  }, [monthlyForecastMap, dashboardYear, dashboardMonth]);

  const dashboardMonthLabel = useMemo(
    () => new Date(dashboardYear, dashboardMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' }),
    [dashboardYear, dashboardMonth]
  );
  const bestModelUsed = useMemo(() => {
    const completed = jobs.filter((job) => job.status === 'completed');
    if (completed.length === 0) return 'N/A';
    const best = completed.reduce((currentBest, job) => {
      const currentAccuracy = currentBest.accuracy ?? 0;
      const nextAccuracy = job.accuracy ?? 0;
      return nextAccuracy > currentAccuracy ? job : currentBest;
    }, completed[0]);
    return best.modelId;
  }, [jobs]);
  const submissionRate = useMemo(() => {
    if (dataQuality) return `${dataQuality.completeness.toFixed(1)}%`;
    return 'N/A';
  }, [dataQuality]);
  const currentMonthHolidayCount = useMemo(() => {
    const year = dashboardYear;
    const month = dashboardMonth;
    const totalDays = daysInMonth(year, month);
    let holidayCount = 0;

    for (let day = 1; day <= totalDays; day += 1) {
      if (getPHHoliday(day, month, year)) {
        holidayCount += 1;
      }
    }

    return holidayCount;
  }, [dashboardMonth, dashboardYear]);

  // Weather data fetched from Open-Meteo API (falls back to climatological averages)
  const [weatherData, setWeatherData] = useState<MonthlyWeather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  useEffect(() => {
    setWeatherLoading(true);
    fetchMonthlyWeather(dashboardYear, dashboardMonth)
      .then((data) => setWeatherData(data))
      .finally(() => setWeatherLoading(false));
  }, [dashboardMonth, dashboardYear]);

  // Fallback arrays used while loading or if API is unavailable
  const FALLBACK_HIGH = [30.6, 31.2, 32.0, 32.4, 33.1, 32.8, 31.9, 31.6, 31.5, 31.2, 30.9, 30.7];
  const FALLBACK_LOW  = [23.7, 24.0, 24.6, 25.1, 25.4, 25.2, 24.9, 24.8, 24.7, 24.5, 24.1, 23.9];
  const FALLBACK_PREC = [7.2,  6.8,  5.9,  4.8,  9.4, 14.7, 17.3, 16.2, 15.8, 18.1, 13.4, 10.2];

  const monthHighTempC       = weatherData?.avgHighTemp        ?? FALLBACK_HIGH[dashboardMonth];
  const monthLowTempC        = weatherData?.avgLowTemp         ?? FALLBACK_LOW[dashboardMonth];
  const monthPrecipitationCm = weatherData?.totalPrecipitation ?? FALLBACK_PREC[dashboardMonth];
  const weatherSource        = weatherData?.source ?? 'fallback';
  const isPeakSeason = useMemo(() => {
    const peakSeasonMonths = [2, 3, 4, 11];
    return peakSeasonMonths.includes(dashboardMonth) ? 1 : 0;
  }, [dashboardMonth]);
  const isDecember = useMemo(() => (dashboardMonth === 11 ? 1 : 0), [dashboardMonth]);
  const isLockdown: number = 0;
  const connectedEndpoint = useMemo(
    () => endpoints.find((endpoint) => endpoint.status === 'active') ?? endpoints[0],
    [endpoints]
  );
  const apiReflectedEndpoint = useMemo(
    () => endpoints.find((endpoint) => endpoint.name === 'Historical Data Service') ?? connectedEndpoint,
    [connectedEndpoint, endpoints]
  );
  const touristTrendParameters = useMemo<TouristTrendParameter[]>(() => {
    const reflectionLabel = apiReflectedEndpoint
      ? apiReflectedEndpoint.status === 'active'
        ? `Connected via ${apiReflectedEndpoint.name}`
        : `${apiReflectedEndpoint.name} currently disconnected`
      : 'Awaiting API connection';

    return [
      {
        label: 'Peak Season',
        value: isPeakSeason === 1 ? 'Yes' : 'No',
        statusLabel: 'Manual logic pending',
        note: 'Binary: Yes = 1, No = 0.',
      },
      {
        label: 'Philippine Holidays',
        value: `${currentMonthHolidayCount} holidays`,
        endpointId: endpoints[0]?.id,
        endpointName: endpoints[0]?.name,
        statusLabel: reflectionLabel,
        note: 'Displaying the number of holidays in the current month.',
      },
      {
        label: 'Average High Temperature',
        value: weatherLoading ? 'Loading…' : `${Number(monthHighTempC).toFixed(1)} °C`,
        endpointId: endpoints[1]?.id,
        endpointName: endpoints[1]?.name,
        statusLabel: weatherLoading
          ? 'Fetching from Open-Meteo…'
          : weatherSource === 'api'
          ? 'Live data via Open-Meteo API'
          : 'Using climatological average (API unavailable)',
        note: `Average daily high temperature for ${dashboardMonthLabel} in Celsius.`,
      },
      {
        label: 'Average Low Temperature',
        value: weatherLoading ? 'Loading…' : `${Number(monthLowTempC).toFixed(1)} °C`,
        endpointId: endpoints[1]?.id,
        endpointName: endpoints[1]?.name,
        statusLabel: weatherLoading
          ? 'Fetching from Open-Meteo…'
          : weatherSource === 'api'
          ? 'Live data via Open-Meteo API'
          : 'Using climatological average (API unavailable)',
        note: `Average daily low temperature for ${dashboardMonthLabel} in Celsius.`,
      },
      {
        label: 'Precipitation',
        value: weatherLoading ? 'Loading…' : `${Number(monthPrecipitationCm).toFixed(1)} cm`,
        endpointId: endpoints[2]?.id,
        endpointName: endpoints[2]?.name,
        statusLabel: weatherLoading
          ? 'Fetching from Open-Meteo…'
          : weatherSource === 'api'
          ? 'Live data via Open-Meteo API'
          : 'Using climatological average (API unavailable)',
        note: `Total precipitation for ${dashboardMonthLabel} in centimetres.`,
      },
      {
        label: 'Inflation Rate',
        value: `${inflationRateInput}%`,
        statusLabel: 'Manual logic pending',
        note: 'Input value is reflected in this parameter.',
      },
      {
        label: 'is December',
        value: isDecember === 1 ? 'Yes' : 'No',
        statusLabel: 'Calendar-based parameter',
        note: 'Binary: Yes = 1, No = 0.',
      },
      {
        label: 'is Lockdown',
        value: isLockdown === 1 ? 'Yes' : 'No',
        statusLabel: 'Manual logic pending',
        note: 'Binary: Yes = 1, No = 0.',
      },
      {
        label: 'Top 10 Market Holidays',
        value: 'Will be reflected in data later',
        statusLabel: 'Manual logic pending',
        note: 'Top 10 countries with highest tourist count in current month.',
      },
    ];
  }, [
    apiReflectedEndpoint,
    currentMonthHolidayCount,
    endpoints,
    inflationRateInput,
    isDecember,
    isLockdown,
    isPeakSeason,
    monthHighTempC,
    monthLowTempC,
    monthPrecipitationCm,
    dashboardMonthLabel,
    weatherLoading,
    weatherSource,
  ]);

  const tabs: Array<{ id: string; label: string; icon: DashboardIconName }> = [
    { id: 'overview', label: 'Dashboard', icon: 'dashboard' },
    { id: 'metrics', label: 'Metrics', icon: 'metrics' },
    { id: 'retraining', label: 'Models & Parameters', icon: 'retraining' },
  ];

  const navigationItems: Array<{ id: string; label: string; icon: DashboardIconName }> = [...tabs];
  const activeSectionLabel = activeTab === 'about'
    ? 'About the System'
    : navigationItems.find((item) => item.id === activeTab)?.label || 'Dashboard';

  useEffect(() => {
    if (!isNotificationOpen || latestThreeAlerts.length === 0) return;
    setReadAlertIds((prev) => Array.from(new Set([...prev, ...latestThreeAlerts.map((alert) => alert.id)])));
  }, [isNotificationOpen, latestThreeAlerts]);

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
                <span className={`font-semibold whitespace-nowrap ${item.id === 'retraining' ? 'text-sm lg:text-base' : 'text-lg'}`}>
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
                    {latestThreeAlerts.length > 0 ? latestThreeAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`rounded-lg border px-3 py-2 ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{alert.title || 'Alert Notification'}</p>
                          {!readAlertIds.includes(alert.id) && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />}
                        </div>
                        <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{alert.message}</p>
                        <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {new Date(alert.timestamp).toLocaleString()}
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

            {/* Dashboard Tab */}
            {activeTab === 'overview' && (
              <div className={`space-y-6 rounded-lg p-6 ${isDarkMode ? 'bg-slate-800 text-white border border-slate-700' : 'bg-white border'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className={`rounded-lg shadow p-4 border-l-4 border-sky-500 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{`Total Tourist of ${dashboardMonthLabel}`}</p>
                    <p className="text-3xl font-bold text-sky-500">
                      {selectedDashboardData ? Math.round(selectedDashboardData.actualTotal).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <div className={`rounded-lg shadow p-4 border-l-4 border-sky-500 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Submission Rate</p>
                    <p className="text-3xl font-bold text-sky-500">{submissionRate}</p>
                  </div>
                  <div className={`rounded-lg shadow p-4 border-l-4 border-sky-500 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{`Predicted Tourist of ${dashboardMonthLabel}`}</p>
                    <p className="text-3xl font-bold text-sky-500">
                      {selectedDashboardData ? Math.round(selectedDashboardData.predictedTotal).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <div className={`rounded-lg shadow p-4 border-l-4 border-sky-500 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Best Model Used</p>
                    <p className="text-xl font-bold text-sky-500 break-all">{bestModelUsed}</p>
                  </div>
                </div>

                <TouristForecastTrendChart
                  forecasts={forecasts}
                  predictedMonths={predictedMonthsToShow}
                  onPredictedMonthsChange={setPredictedMonthsToShow}
                />

                <div className="grid grid-cols-1 gap-4">
                  <div className={`${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                    <p className="text-xl md:text-2xl font-bold mb-3">Tourist Trends Data Parameters</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {touristTrendParameters.map((parameter) => {
                        return (
                          <div
                            key={parameter.label}
                            className={`rounded-lg shadow p-4 border-l-4 border-sky-500 transition ${
                              isDarkMode
                                ? 'bg-slate-900 text-gray-100'
                                : 'bg-white text-gray-700'
                            }`}
                          >
                            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{parameter.label}</p>
                            <p className="mt-2 text-xl font-bold text-sky-500">{parameter.value}</p>
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
                {latestMetric && <PerformanceChart latest={latestMetric} />}
                {metrics.length > 0 && <MetricsChart metrics={metrics} />}
              </div>
            )}

            {/* Retraining Tab */}
            {activeTab === 'retraining' && (
              <div className={`space-y-6 rounded-lg p-6 ${isDarkMode ? 'bg-slate-800 text-white border border-slate-700' : 'bg-white border'}`}>
                <div>
                  <h2 className="text-2xl font-bold mb-4">Model Controls</h2>
                </div>
                <div className={`rounded-lg border p-4 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                  <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Inflation Rate Input (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={inflationRateInput}
                    onChange={(e) => setInflationRateInput(e.target.value)}
                    className={`mt-2 w-full md:w-64 p-2 rounded border outline-none text-sm ${isDarkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-white border-gray-300'}`}
                  />
                </div>

                <RetrainingStats jobs={jobs} />

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {jobs.map(job => <RetrainingJobCard key={job.id} job={job} onRetrain={handleStartRetraining} />)}
                </div>

                <div>
                  <h2 className="text-2xl font-bold mb-4">API Parameters</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
                    {touristTrendParameters.map((parameter) => {
                      return (
                        <div
                          key={parameter.label}
                          className={`rounded-lg border px-4 py-3 ${
                            isDarkMode ? 'bg-slate-900 border-slate-700 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-700'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                              <p className="font-semibold">{parameter.label}</p>
                              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                {parameter.value}
                              </p>
                              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                API reflection: {parameter.statusLabel}
                              </p>
                              {parameter.note && (
                                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                  {parameter.note}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleApiParameterAction(parameter.label, parameter.endpointId)}
                              className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600 text-sm"
                            >
                              Check API
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedApiParameter === 'Philippine Holidays' && (
                    <div className={`rounded-lg border p-4 ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b pb-4 border-gray-200 dark:border-slate-700">
                        <h3 className="text-xl font-bold">Philippine Holidays Calendar</h3>
                        <div className="flex gap-2">
                          <select
                            value={viewDate.getMonth()}
                            onChange={handleMonthChange}
                            className={`p-2 rounded border outline-none ${isDarkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-white border-gray-300'}`}
                          >
                            {months.map((month, i) => <option key={month} value={i}>{month}</option>)}
                          </select>
                          <select
                            value={viewDate.getFullYear()}
                            onChange={handleYearChange}
                            className={`p-2 rounded border outline-none ${isDarkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-white border-gray-300'}`}
                          >
                            {years.map(year => <option key={year} value={year}>{year}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-2 mt-4">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} className="text-center font-bold text-sm py-2 opacity-60 uppercase">{day}</div>
                        ))}

                        {[...Array(firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth()))].map((_, i) => (
                          <div key={`empty-${i}`} className="min-h-[90px]"></div>
                        ))}

                        {[...Array(daysInMonth(viewDate.getFullYear(), viewDate.getMonth()))].map((_, i) => {
                          const day = i + 1;
                          const holiday = getPHHoliday(day, viewDate.getMonth(), viewDate.getFullYear());
                          const isSunday = (day + firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth())) % 7 === 1;

                          return (
                            <div
                              key={day}
                              className={`min-h-[90px] p-2 rounded border transition-colors ${
                                isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
                              } ${holiday ? 'border-red-400 bg-red-500/5' : ''}`}
                            >
                              <span className={`text-sm font-bold ${holiday || isSunday ? 'text-red-500' : ''}`}>{day}</span>
                              {holiday && (
                                <div className="mt-2">
                                  <span className="text-[10px] leading-tight font-bold bg-red-500 text-white px-1 py-1 rounded block text-center uppercase">
                                    {holiday}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedApiParameter && selectedApiParameter !== 'Philippine Holidays' && (
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Active parameter: <span className="font-semibold">{selectedApiParameter}</span>
                    </p>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-bold mb-4">Export Data</h2>
                  <DataExport metrics={metrics} alerts={alerts} jobs={jobs} endpoints={endpoints} />
                </div>
              </div>
            )}

            {/* About the System Tab */}
            {activeTab === 'about' && (
              <div className={`space-y-6 rounded-lg p-6 ${isDarkMode ? 'bg-slate-800 text-white border border-slate-700' : 'bg-white border'}`}>
                <div>
                  <h3 className="text-2xl font-bold mb-3">Panglao Tourist Accommodation Demand Forecasting System</h3>
                  <p className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'} leading-relaxed`}>
                    This system helps forecast the future demand for tourist accommodations in Panglao, Bohol by analyzing tourism data and external factors such as Philippine holidays, average high temperature, average low temperature, average precipitation, inflation rate, and top 10 market holidays. It supports local tourism stakeholders in making informed decisions for planning and resource management.
                  </p>
                </div>

                <div>
                  <h4 className="text-xl font-semibold mb-3">System Overview</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`rounded-lg p-4 border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                      <p className="font-semibold mb-2">Forecasting and Monitoring</p>
                      <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm`}>
                        Tracks demand forecasting metrics, drift alerts, and retraining activities to keep model performance reliable.
                      </p>
                    </div>
                    <div className={`rounded-lg p-4 border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                      <p className="font-semibold mb-2">Decision Support</p>
                      <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm`}>
                        Provides actionable insights for accommodation planning, staffing, and resource allocation across peak and off-peak periods.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};