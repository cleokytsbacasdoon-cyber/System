import React, { useState, useEffect, useMemo } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { MetricsCard } from '../components/MetricsCard';
import { DriftAlertCard } from '../components/DriftAlertCard';
import { RetrainingJobCard } from '../components/RetrainingJobCard';
import { APIEndpointCard } from '../components/APIEndpointCard';
import { MetricsChart } from '../components/MetricsChart';
import { PerformanceChart } from '../components/PerformanceChart';
import { DriftStats } from '../components/DriftStats';
import { RetrainingStats } from '../components/RetrainingStats';
import { DataExport } from '../components/DataExport';
import { Tabs } from '../components/Tabs';
import { 
  getModelMetrics, 
  getDriftAlerts, 
  getRetrainingJobs, 
  getAPIEndpoints,
  resolveDriftAlert,
  startRetrainingJob,
  checkEndpointStatus 
} from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { ModelMetrics, DriftAlert, RetrainingJob, APIEndpoint } from '../types';

export const Dashboard: React.FC = () => {
  const { addToast } = useToast();
  const { isDarkMode } = useDarkMode();
  const [metrics, setMetrics] = useState<ModelMetrics[]>([]);
  const [alerts, setAlerts] = useState<DriftAlert[]>([]);
  const [jobs, setJobs] = useState<RetrainingJob[]>([]);
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshInterval, setRefreshInterval] = useState(30);

  // CALENDAR STATE
  const [viewDate, setViewDate] = useState(new Date());
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // UPDATED: Generate years from 2016 to 2030
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [metricsData, alertsData, jobsData, endpointsData] = await Promise.all([
        getModelMetrics(),
        getDriftAlerts(),
        getRetrainingJobs(),
        getAPIEndpoints(),
      ]);
      setMetrics(metricsData);
      setAlerts(alertsData);
      setJobs(jobsData);
      setEndpoints(endpointsData);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- UPDATED PHILIPPINE HOLIDAY LOGIC ---
  const getPHHoliday = (day: number, month: number, year: number) => {
    // Fixed Date Holidays
    const holidayMap: { [key: string]: string } = {
      "0-1": "New Year's Day",
      "0-2": "Special Non-Working Day",
      "1-25": "EDSA Revolution Anniversary",
      "3-9": "Araw ng Kagitingan",
      "4-1": "Labor Day",
      "5-12": "Independence Day",
      "7-21": "Ninoy Aquino Day",
      "7-25": "National Heroes Day", // Note: Usually last Monday, simplified here
      "10-1": "All Saints' Day",
      "10-2": "All Souls' Day",
      "10-30": "Bonifacio Day",
      "11-8": "Immaculate Conception",
      "11-24": "Christmas Eve",
      "11-25": "Christmas Day",
      "11-30": "Rizal Day",
      "11-31": "New Year's Eve"
    };

    // Moveable Holidays (Holy Week Logic for 2024-2030)
    const moveable: { [key: string]: string } = {};
    
    // Logic for specific years (Common monitoring window)
    if (year === 2024) {
        if (month === 2 && day === 28) moveable[`${month}-${day}`] = "Maundy Thursday";
        if (month === 2 && day === 29) moveable[`${month}-${day}`] = "Good Friday";
    } else if (year === 2025) {
        if (month === 3 && day === 17) moveable[`${month}-${day}`] = "Maundy Thursday";
        if (month === 3 && day === 18) moveable[`${month}-${day}`] = "Good Friday";
    } else if (year === 2026) {
        if (month === 3 && day === 2) moveable[`${month}-${day}`] = "Maundy Thursday";
        if (month === 3 && day === 3) moveable[`${month}-${day}`] = "Good Friday";
        if (month === 3 && day === 4) moveable[`${month}-${day}`] = "Black Saturday";
    } else if (year === 2027) {
        if (month === 2 && day === 25) moveable[`${month}-${day}`] = "Maundy Thursday";
        if (month === 2 && day === 26) moveable[`${month}-${day}`] = "Good Friday";
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

  const handleCheckEndpoint = async (endpointId: string) => {
    try {
      const updatedEndpoint = await checkEndpointStatus(endpointId);
      setEndpoints(endpoints.map(e => e.id === endpointId ? updatedEndpoint : e));
      addToast('Endpoint checked', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to check endpoint', 'error');
    }
  };

  const latestMetric = useMemo(() => metrics.length > 0 ? metrics[0] : null, [metrics]);
  const unresolvedAlerts = useMemo(() => alerts.filter(a => !a.resolved), [alerts]);

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'metrics', label: '📈 Metrics' },
    { id: 'alerts', label: '⚠️ Alerts' },
    { id: 'retraining', label: '🔄 Retraining' },
    { id: 'api', label: '🔗 API' },
    { id: 'ph-calendar', label: ' PH Calendar' },
  ];

  // CALENDAR LOGIC HELPERS
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(parseInt(e.target.value));
    setViewDate(newDate);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(viewDate);
    newDate.setFullYear(parseInt(e.target.value));
    setViewDate(newDate);
  };

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
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* HEADER SECTION */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-dark'}`}>ML Monitoring Dashboard</h1>
            <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Real-time monitoring and analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('export')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 shadow-sm font-medium ${
                activeTab === 'export' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              📥 EXPORT
            </button>
            <button onClick={() => loadData()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-sm font-medium">
              🔄 REFRESH
            </button>
          </div>
        </div>

        <Tabs activeTab={activeTab} tabs={tabs} onTabChange={setActiveTab} />

        {/* Overview Tab */}
        {activeTab === 'overview' && (
           <div className={`space-y-6 rounded-lg p-6 ${isDarkMode ? 'bg-slate-800 text-white border border-slate-700' : 'bg-white border'}`}>
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
           {latestMetric && <MetricsCard metric={latestMetric} />}
           <DriftStats alerts={alerts} />
           <RetrainingStats jobs={jobs} />
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
            <div className="space-y-4">
              {alerts.length > 0 ? alerts.map(alert => <DriftAlertCard key={alert.id} alert={alert} onResolve={handleResolveAlert} />) : <p>No alerts</p>}
            </div>
          </div>
        )}

        {/* Retraining Tab */}
        {activeTab === 'retraining' && (
          <div className={`space-y-6 rounded-lg p-6 ${isDarkMode ? 'bg-slate-800 text-white border border-slate-700' : 'bg-white border'}`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {jobs.map(job => <RetrainingJobCard key={job.id} job={job} onRetrain={handleStartRetraining} />)}
            </div>
          </div>
        )}

        {/* API Tab */}
        {activeTab === 'api' && (
          <div className={`space-y-6 rounded-lg p-6 ${isDarkMode ? 'bg-slate-800 text-white border border-slate-700' : 'bg-white border'}`}>
            {endpoints.map(endpoint => <APIEndpointCard key={endpoint.id} endpoint={endpoint} onCheck={handleCheckEndpoint} />)}
          </div>
        )}

        {/* PH CALENDAR TAB */}
        {activeTab === 'ph-calendar' && (
          <div className={`space-y-6 rounded-lg p-6 ${isDarkMode ? 'bg-slate-800 text-white border border-slate-700' : 'bg-white border'}`}>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b pb-4 border-gray-100 dark:border-slate-700">
              <h2 className="text-2xl font-bold">Philippine Holiday Tracker</h2>
              <div className="flex gap-2">
                <select 
                  value={viewDate.getMonth()} 
                  onChange={handleMonthChange} 
                  className={`p-2 rounded border outline-none ${isDarkMode ? 'bg-slate-900 text-white border-slate-700' : 'bg-white border-gray-300'}`}
                >
                  {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select 
                  value={viewDate.getFullYear()} 
                  onChange={handleYearChange} 
                  className={`p-2 rounded border outline-none ${isDarkMode ? 'bg-slate-900 text-white border-slate-700' : 'bg-white border-gray-300'}`}
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-bold text-sm py-2 opacity-60 uppercase">{day}</div>
              ))}
              
              {[...Array(firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth()))].map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[100px]"></div>
              ))}

              {[...Array(daysInMonth(viewDate.getFullYear(), viewDate.getMonth()))].map((_, i) => {
                const day = i + 1;
                const holiday = getPHHoliday(day, viewDate.getMonth(), viewDate.getFullYear());
                const isSunday = (day + firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth())) % 7 === 1;

                return (
                  <div 
                    key={day} 
                    className={`min-h-[100px] p-2 rounded border transition-colors ${
                      isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-100'
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

        {/* EXPORT CONTEXT */}
        {activeTab === 'export' && (
          <div className={`space-y-6 rounded-lg p-6 ${isDarkMode ? 'bg-slate-800 text-white border border-slate-700' : 'bg-white border'}`}>
            <DataExport metrics={metrics} alerts={alerts} jobs={jobs} endpoints={endpoints} />
          </div>
        )}

      </div>
    </div>
  );
};