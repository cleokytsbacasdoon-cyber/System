import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { DemandAlert } from '../types';

interface DriftStatsProps {
  alerts: DemandAlert[];
}

export const DriftStats: React.FC<DriftStatsProps> = ({ alerts }) => {
  const { isDarkMode } = useDarkMode();
  const totalAlerts = alerts.length;
  const unresolvedAlerts = alerts.filter(a => !a.resolved).length;
  const highSeverity = alerts.filter(a => a.severity === 'high' && !a.resolved).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className={`rounded-lg shadow p-4 border-l-4 border-blue-500 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Alerts</p>
        <p className="text-3xl font-bold text-blue-500">{totalAlerts}</p>
      </div>
      
      <div className={`rounded-lg shadow p-4 border-l-4 border-orange-500 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Unresolved</p>
        <p className="text-3xl font-bold text-orange-500">{unresolvedAlerts}</p>
      </div>
      
      <div className={`rounded-lg shadow p-4 border-l-4 border-red-500 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>High Severity</p>
        <p className="text-3xl font-bold text-red-500">{highSeverity}</p>
      </div>
      
      <div className={`rounded-lg shadow p-4 border-l-4 border-purple-500 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>All Resolved</p>
        <p className="text-3xl font-bold text-purple-500">{alerts.filter(a => a.resolved).length}</p>
      </div>
    </div>
  );
};
