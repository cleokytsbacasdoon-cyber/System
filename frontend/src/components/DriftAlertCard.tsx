import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { DemandAlert } from '../types';

interface DriftAlertCardProps {
  alert: DemandAlert;
  onResolve: (alertId: string) => void;
}

export const DriftAlertCard: React.FC<DriftAlertCardProps> = ({ alert, onResolve }) => {
  const { isDarkMode } = useDarkMode();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return isDarkMode ? 'bg-red-900 border-red-600 text-red-200' : 'bg-red-100 border-red-500 text-red-800';
      case 'medium':
        return isDarkMode ? 'bg-yellow-900 border-yellow-600 text-yellow-200' : 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'low':
        return isDarkMode ? 'bg-blue-900 border-blue-600 text-blue-200' : 'bg-blue-100 border-blue-500 text-blue-800';
      default:
        return isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  const getAlertTypeBadge = (alertType?: string) => {
    if (!alertType) return null;
    const colors = {
      seasonality: 'bg-purple-500',
      trend: 'bg-blue-500',
      anomaly: 'bg-orange-500',
      drift: 'bg-red-500',
    };
    return (
      <span className={`text-xs px-2 py-1 rounded ${colors[alertType as keyof typeof colors] || 'bg-gray-500'} text-white ml-2`}>
        {alertType}
      </span>
    );
  };

  return (
    <div className={`rounded-lg shadow-md p-4 border-l-4 ${getSeverityColor(alert.severity)} ${alert.resolved ? 'opacity-60' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-semibold mb-2">
            {alert.message}
            {getAlertTypeBadge(alert.alertType)}
          </h4>
          <p className="text-sm mb-2">
            Threshold: {alert.threshold.toFixed(4)} | Current: {alert.currentValue.toFixed(4)}
          </p>
          <p className="text-xs opacity-75">
            {new Date(alert.timestamp).toLocaleString()}
          </p>
        </div>
        {!alert.resolved && (
          <button
            onClick={() => onResolve(alert.id)}
            className="ml-4 px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
          >
            Resolve
          </button>
        )}
        {alert.resolved && (
          <span className="ml-4 px-3 py-1 text-sm bg-green-500 text-white rounded">
            Resolved
          </span>
        )}
      </div>
    </div>
  );
};
