import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { ForecastMetrics, DemandAlert, RetrainingJob, APIEndpoint } from '../types';

interface DataExportProps {
  metrics: ForecastMetrics[];
  alerts: DemandAlert[];
  jobs: RetrainingJob[];
  endpoints: APIEndpoint[];
}

export const DataExport: React.FC<DataExportProps> = ({ metrics, alerts, jobs, endpoints }) => {
  const { isDarkMode } = useDarkMode();
  const exportToJSON = <T,>(data: T, filename: string) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToCSV = <T extends object>(data: T[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]) as Array<keyof T>;
    const csv = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return String(value ?? '');
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportMetrics = (format: 'json' | 'csv') => {
    if (format === 'json') {
      exportToJSON(metrics, 'model-metrics');
    } else {
      exportToCSV(metrics, 'model-metrics');
    }
  };

  const handleExportAlerts = (format: 'json' | 'csv') => {
    if (format === 'json') {
      exportToJSON(alerts, 'drift-alerts');
    } else {
      exportToCSV(alerts, 'drift-alerts');
    }
  };

  const handleExportJobs = (format: 'json' | 'csv') => {
    if (format === 'json') {
      exportToJSON(jobs, 'retraining-jobs');
    } else {
      exportToCSV(jobs, 'retraining-jobs');
    }
  };

  const handleExportAll = () => {
    const allData = {
      exportDate: new Date().toISOString(),
      metrics,
      alerts,
      jobs,
      endpoints,
    };
    exportToJSON(allData, 'ml-monitoring-full-export');
  };

  return (
    <div className="space-y-4">
      <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-dark'}`}>Export Data</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`rounded-lg shadow p-4 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
          <h4 className="font-semibold mb-3">Model Metrics</h4>
          <div className="flex gap-2">
            <button
              onClick={() => handleExportMetrics('csv')}
              className="flex-1 px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              CSV
            </button>
            <button
              onClick={() => handleExportMetrics('json')}
              className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              JSON
            </button>
          </div>
        </div>

        <div className={`rounded-lg shadow p-4 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
          <h4 className="font-semibold mb-3">Drift Alerts</h4>
          <div className="flex gap-2">
            <button
              onClick={() => handleExportAlerts('csv')}
              className="flex-1 px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              CSV
            </button>
            <button
              onClick={() => handleExportAlerts('json')}
              className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              JSON
            </button>
          </div>
        </div>

        <div className={`rounded-lg shadow p-4 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
          <h4 className="font-semibold mb-3">Retraining Jobs</h4>
          <div className="flex gap-2">
            <button
              onClick={() => handleExportJobs('csv')}
              className="flex-1 px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              CSV
            </button>
            <button
              onClick={() => handleExportJobs('json')}
              className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              JSON
            </button>
          </div>
        </div>

        <div className={`rounded-lg shadow p-4 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
          <h4 className="font-semibold mb-3">Full Export</h4>
          <button
            onClick={handleExportAll}
            className="w-full px-3 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
          >
            Download All (JSON)
          </button>
        </div>
      </div>
    </div>
  );
};
