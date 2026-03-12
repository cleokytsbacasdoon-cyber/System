import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { DemandForecast } from '../types';

interface AccuracyMonitoringProps {
  forecasts: DemandForecast[];
}

export const AccuracyMonitoring: React.FC<AccuracyMonitoringProps> = ({ forecasts }) => {
  const { isDarkMode } = useDarkMode();

  // Calculate metrics
  const mae = (forecasts.reduce((sum, f) => sum + Math.abs(f.predictedOccupancy - f.actualOccupancy), 0) / forecasts.length).toFixed(4);
  const rmse = Math.sqrt(forecasts.reduce((sum, f) => sum + (f.predictedOccupancy - f.actualOccupancy) ** 2, 0) / forecasts.length).toFixed(4);
  const actualMean = forecasts.reduce((sum, f) => sum + f.actualOccupancy, 0) / forecasts.length;
  const r2Score = ((1 - forecasts.reduce((sum, f) => sum + (f.predictedOccupancy - f.actualOccupancy) ** 2, 0) / forecasts.reduce((sum, f) => sum + (f.actualOccupancy - actualMean) ** 2, 0)) * 100).toFixed(2);

  // Calculate accuracy trend
  const windowSize = Math.max(5, Math.floor(forecasts.length / 10));
  const accuracyTrend = [];
  for (let i = 0; i < forecasts.length; i += Math.max(1, Math.floor(forecasts.length / 20))) {
    const window = forecasts.slice(i, i + windowSize);
    const mape = (window.reduce((sum, f) => sum + Math.abs((f.predictedOccupancy - f.actualOccupancy) / f.actualOccupancy), 0) / window.length) * 100;
    const accuracy = Math.max(0, 100 - mape);
    accuracyTrend.push(accuracy);
  }

  // Get prediction errors for distribution
  const errors = forecasts.map((f) => Math.abs(f.predictedOccupancy - f.actualOccupancy));
  const maxError = Math.max(...errors);
  const binCount = 10;
  const bins = Array(binCount).fill(0);
  errors.forEach((error) => {
    const binIndex = Math.min(Math.floor((error / maxError) * binCount), binCount - 1);
    bins[binIndex]++;
  });

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-lg shadow-md p-4 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Mean Absolute Error</p>
          <p className="text-2xl font-bold text-blue-500">{mae} rooms</p>
        </div>
        <div className={`rounded-lg shadow-md p-4 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Root Mean Squared Error</p>
          <p className="text-2xl font-bold text-purple-500">{rmse} rooms</p>
        </div>
        <div className={`rounded-lg shadow-md p-4 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>R² Score</p>
          <p className="text-2xl font-bold text-green-500">{r2Score}%</p>
        </div>
      </div>

      {/* Scatter Plot (Predicted vs Actual) */}
      <div className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-dark'}`}>Occupancy Forecast vs Actual</h3>
        <div style={{ position: 'relative', height: '300px' }} className="flex items-end justify-around gap-1">
          {forecasts.slice(-30).map((forecast, index) => {
            const maxVal = Math.max(...forecasts.map((f) => Math.max(f.actualOccupancy, f.predictedOccupancy)));
            const actualHeight = (forecast.actualOccupancy / maxVal) * 250;
            const predictedHeight = (forecast.predictedOccupancy / maxVal) * 250;
            const error = Math.abs(forecast.predictedOccupancy - forecast.actualOccupancy);
            const errorPercent = ((error / forecast.actualOccupancy) * 100).toFixed(0);

            return (
              <div key={index} className="flex flex-col items-center relative group">
                <div className="flex gap-1 items-end">
                  <div
                    className="w-2 bg-blue-500 rounded-t"
                    style={{ height: `${actualHeight}px` }}
                    title={`Actual: ${forecast.actualOccupancy.toFixed(0)} rooms`}
                  />
                  <div
                    className="w-2 bg-orange-500 rounded-t"
                    style={{ height: `${predictedHeight}px` }}
                    title={`Predicted: ${forecast.predictedOccupancy.toFixed(0)} rooms`}
                  />
                </div>
                <div className={`absolute bottom-[-30px] text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  +{errorPercent}%
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 justify-center mt-10">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded" />
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Actual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded" />
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Predicted</span>
          </div>
        </div>
      </div>

      {/* Error Distribution */}
      <div className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-dark'}`}>Prediction Error Distribution</h3>
        <div className="flex items-end justify-around h-48 gap-1">
          {bins.map((count, index) => {
            const maxCount = Math.max(...bins);
            const height = (count / maxCount) * 180;

            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div
                  className="w-full bg-gradient-to-t from-purple-500 to-purple-600 rounded-t transition-all"
                  style={{ height: `${height}px` }}
                  title={`${count} predictions`}
                />
                <div className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {(((index + 1) / binCount) * maxError).toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
        <p className={`text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>Error Magnitude</p>
      </div>

      {/* Accuracy Trend */}
      <div className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-dark'}`}>Forecast Accuracy Over Time</h3>
        <div className="flex items-center justify-around h-40 gap-2">
          {accuracyTrend.map((accuracy, index) => {
            const height = (accuracy / 100) * 140;

            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div
                  className="w-full bg-gradient-to-t from-green-500 to-green-600 rounded-t"
                  style={{ height: `${height}px` }}
                  title={`${accuracy.toFixed(2)}%`}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs mt-4">
          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Early Predictions</span>
          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Recent Predictions</span>
        </div>
      </div>
    </div>
  );
};
