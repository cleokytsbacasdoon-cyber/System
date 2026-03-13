import React, { useState, useEffect, useMemo } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { MetricsCard } from '../components/MetricsCard';
import { DriftAlertCard } from '../components/DriftAlertCard';
import { RetrainingJobCard } from '../components/RetrainingJobCard';
import { MetricsChart } from '../components/MetricsChart';
import { PerformanceChart } from '../components/PerformanceChart';
import { DriftStats } from '../components/DriftStats';
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
  resolveDriftAlert,
  startRetrainingJob,
  checkEndpointStatus 
} from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { ModelMetrics, DriftAlert, RetrainingJob, APIEndpoint, DemandForecast, DataQuality } from '../types';

interface DashboardProps {
  onSettingsClick: () => void;
}

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
    loadData();
    const interval = setInterval(loadData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(clockTimer);
  }, []);

  const loadData = async () => {
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
  };

  const apiParameters = [
    'Philippine Holidays',
    'Average High Temperature',
    'Average Low Temperature',
    'Average Precipitation',
    'Inflation Rate',
    'Top 10 Market Holidays',
  ];

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

  const handleResolveAlert = async (alertId: string) => {
    try {
      await resolveDriftAlert(alertId);
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, resolved: true } : a));
      addToast('Alert resolved', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to resolve alert', 'error');
    }
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
  const unresolvedAlerts = useMemo(() => alerts.filter(a => !a.resolved), [alerts]);
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
  const nextMonthForecast = useMemo(() => {
    if (forecasts.length === 0) return null;
    const sample = forecasts.slice(-30);
    const total = sample.reduce((sum, item) => sum + item.predictedOccupancy, 0);
    return Math.round(total / sample.length);
  }, [forecasts]);
  const latestDataMonth = useMemo(() => {
    if (!latestForecast) return 'Latest Month';
    return new Date(latestForecast.date).toLocaleString('default', { month: 'long' });
  }, [latestForecast]);
  const nextForecastMonth = useMemo(() => {
    if (!latestForecast) return 'Next Month';
    const date = new Date(latestForecast.date);
    date.setMonth(date.getMonth() + 1);
    return date.toLocaleString('default', { month: 'long' });
  }, [latestForecast]);
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

  const tabs = [
    { id: 'overview', label: 'Dashboard', icon: '📊' },
    { id: 'metrics', label: 'Metrics', icon: '📈' },
    { id: 'alerts', label: 'Alerts', icon: '⚠️' },
    { id: 'retraining', label: 'Retraining', icon: '🔄' },
    { id: 'api', label: 'API', icon: '🔗' },
  ];

  const navigationItems = [...tabs, { id: 'export', label: 'Export', icon: '📥' }, { id: 'about', label: 'About the System', icon: 'ℹ️' }];
  const activeSectionLabel = navigationItems.find((item) => item.id === activeTab)?.label || 'Dashboard';

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
                    ? 'hover:bg-slate-800 text-gray-200'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <span className="w-6 text-center text-lg font-semibold">{item.icon}</span>
                <span className="font-semibold text-lg">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6">
            <div className="flex items-center justify-around mb-4">
              <button
                onClick={toggleDarkMode}
                title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
                className={`p-3 rounded-lg transition text-xl border ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-600 text-gray-100 hover:bg-slate-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              <button
                onClick={onSettingsClick}
                title="Settings"
                className={`p-3 text-xl rounded-lg transition border ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-600 text-gray-100 hover:bg-slate-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                ⚙️
              </button>
              <button
                onClick={() => loadData()}
                title="Refresh Dashboard"
                className={`p-3 text-xl rounded-lg transition border ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-600 text-gray-100 hover:bg-slate-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                🔄
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
                      ? 'bg-slate-800 text-gray-200'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={toggleDarkMode}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  isDarkMode ? 'bg-slate-800 text-gray-100' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {isDarkMode ? '☀️ Light' : '🌙 Dark'}
              </button>
              <button
                onClick={onSettingsClick}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white"
              >
                ⚙️ Settings
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
                  <div className={`rounded-lg shadow p-4 border-l-4 border-blue-500 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{`Total Tourist of ${dashboardMonthLabel}`}</p>
                    <p className="text-3xl font-bold text-blue-500">
                      {selectedDashboardData ? Math.round(selectedDashboardData.actualTotal).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <div className={`rounded-lg shadow p-4 border-l-4 border-orange-500 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Submission Rate</p>
                    <p className="text-3xl font-bold text-orange-500">{submissionRate}</p>
                  </div>
                  <div className={`rounded-lg shadow p-4 border-l-4 border-green-500 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{`Predicted Tourist of ${dashboardMonthLabel}`}</p>
                    <p className="text-3xl font-bold text-green-500">
                      {selectedDashboardData ? Math.round(selectedDashboardData.predictedTotal).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <div className={`rounded-lg shadow p-4 border-l-4 border-purple-500 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Best Model Used</p>
                    <p className="text-xl font-bold text-purple-500 break-all">{bestModelUsed}</p>
                  </div>
                </div>

                <TouristForecastTrendChart
                  forecasts={forecasts}
                  predictedMonths={predictedMonthsToShow}
                  onPredictedMonthsChange={setPredictedMonthsToShow}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className={`rounded-lg shadow p-4 border-l-4 border-blue-500 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Metrics</p>
                    <p className="text-3xl font-bold text-blue-500">{metrics.length}</p>
                  </div>
                  <div className={`rounded-lg shadow p-4 border-l-4 border-orange-500 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Active Alerts</p>
                    <p className="text-3xl font-bold text-orange-500">{unresolvedAlerts.length}</p>
                  </div>
                  <div className={`rounded-lg shadow p-4 border-l-4 border-green-500 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Retraining Jobs</p>
                    <p className="text-3xl font-bold text-green-500">{jobs.length}</p>
                  </div>
                  <div className={`rounded-lg shadow p-4 border-l-4 border-purple-500 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>API Endpoints</p>
                    <p className="text-3xl font-bold text-purple-500">{endpoints.length}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`rounded-lg shadow p-4 border-l-4 border-cyan-500 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Predicted tourist accommodation demand: Number of tourists of the recent data received</p>
                    <p className="text-3xl font-bold text-cyan-500">
                      {latestForecast ? Math.round(latestForecast.actualOccupancy).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <div className={`rounded-lg shadow p-4 border-l-4 border-indigo-500 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Predicted tourist accommodation demand: Forecast for next month</p>
                    <p className="text-3xl font-bold text-indigo-500">
                      {nextMonthForecast !== null ? nextMonthForecast.toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>

                {latestMetric && <MetricsCard metric={latestMetric} />}
              </div>
            )}

            {/* Metrics Tab */}
            {activeTab === 'metrics' && (
              <div className={`space-y-6 rounded-lg p-6 ${isDarkMode ? 'bg-slate-800 text-white border border-slate-700' : 'bg-white border'}`}>
                {latestMetric && <PerformanceChart latest={latestMetric} />}
                {metrics.length > 0 && <MetricsChart metrics={metrics} />}
              </div>
            )}

            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
              <div className={`space-y-6 rounded-lg p-6 ${isDarkMode ? 'bg-slate-800 text-white border border-slate-700' : 'bg-white border'}`}>
                <DriftStats alerts={alerts} />
                <div className="space-y-4">
                  {alerts.length > 0 ? alerts.map(alert => <DriftAlertCard key={alert.id} alert={alert} onResolve={handleResolveAlert} />) : <p>No alerts</p>}
                </div>
              </div>
            )}

            {/* Retraining Tab */}
            {activeTab === 'retraining' && (
              <div className={`space-y-6 rounded-lg p-6 ${isDarkMode ? 'bg-slate-800 text-white border border-slate-700' : 'bg-white border'}`}>
                <RetrainingStats jobs={jobs} />

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {jobs.map(job => <RetrainingJobCard key={job.id} job={job} onRetrain={handleStartRetraining} />)}
                </div>
              </div>
            )}

            {/* API Tab */}
            {activeTab === 'api' && (
              <div className={`space-y-6 rounded-lg p-6 ${isDarkMode ? 'bg-slate-800 text-white border border-slate-700' : 'bg-white border'}`}>
                <div>
                  <h2 className="text-2xl font-bold mb-4">API Parameters</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
                    {apiParameters.map((parameter, index) => {
                      const mappedEndpoint = endpoints.length > 0 ? endpoints[index % endpoints.length] : undefined;
                      return (
                        <div
                          key={parameter}
                          className={`rounded-lg border px-4 py-3 ${
                            isDarkMode ? 'bg-slate-900 border-slate-700 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-700'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                              <p className="font-semibold">{parameter}</p>
                              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Endpoint: {mappedEndpoint ? mappedEndpoint.name : 'Not available'}
                              </p>
                            </div>
                            <button
                              onClick={() => handleApiParameterAction(parameter, mappedEndpoint?.id)}
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
              </div>
            )}

            {/* EXPORT CONTEXT */}
            {activeTab === 'export' && (
              <div className={`space-y-6 rounded-lg p-6 ${isDarkMode ? 'bg-slate-800 text-white border border-slate-700' : 'bg-white border'}`}>
                <DataExport metrics={metrics} alerts={alerts} jobs={jobs} endpoints={endpoints} />
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