import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { ForecastMetrics } from '../types';

interface MetricsCardProps {
  metric: ForecastMetrics;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({ metric }) => {
  const { isDarkMode } = useDarkMode();

  return (
    <div className={`rounded-lg shadow-md p-6 border-l-4 border-primary ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
      <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-dark'}`}>Forecast Accuracy Metrics</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>MAPE</p>
          <p className="text-2xl font-bold text-primary">{metric.mape.toFixed(2)}%</p>
        </div>
        <div>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>RMSE</p>
          <p className="text-2xl font-bold text-primary">{metric.rmse.toFixed(2)} rooms</p>
        </div>
        <div>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>MAE</p>
          <p className="text-2xl font-bold text-secondary">{metric.mae.toFixed(2)} rooms</p>
        </div>
        <div>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>R² Score</p>
          <p className="text-2xl font-bold text-secondary">{metric.r2Score.toFixed(3)}</p>
        </div>
      </div>
      <p className={`text-xs mt-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
        Last updated: {new Date(metric.timestamp).toLocaleString()}
      </p>
    </div>
  );
};
