import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { FeatureImportance, DemandForecast } from '../types';

interface ModelInsightsProps {
  features: FeatureImportance[];
  forecasts: DemandForecast[];
}

export const ModelInsights: React.FC<ModelInsightsProps> = ({ features, forecasts }) => {
  const { isDarkMode } = useDarkMode();

  // Get top 10 features
  const topFeatures = [...features].sort((a, b) => b.importance - a.importance).slice(0, 10);

  // Calculate feature drift (compare recent vs older forecasts)
  const mid = Math.floor(forecasts.length / 2);
  const recentForecasts = forecasts.slice(mid);
  const olderForecasts = forecasts.slice(0, mid);

  const recentMean = recentForecasts.reduce((sum, f) => sum + f.actualOccupancy, 0) / recentForecasts.length;
  const olderMean = olderForecasts.reduce((sum, f) => sum + f.actualOccupancy, 0) / olderForecasts.length;
  const driftPercentage = Number(((Math.abs(recentMean - olderMean) / olderMean) * 100).toFixed(2));

  // Sample forecasts for explanation
  const sampleForecasts = forecasts.slice(-5).reverse();

  return (
    <div className="space-y-6">
      {/* Top 10 Features */}
      <div className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-dark'}`}>Top Demand Forecast Drivers</h3>
        <div className="space-y-3">
          {topFeatures.map((feature, index) => (
            <div key={feature.name}>
              <div className="flex justify-between mb-1">
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {index + 1}. {feature.name}
                </span>
                <span className={`text-sm font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {(feature.importance * 100).toFixed(2)}%
                </span>
              </div>
              <div className={`w-full h-6 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'} overflow-hidden`}>
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(feature.importance * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Drift Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-dark'}`}>Feature Drift Alert</h3>
          <div className={`p-4 rounded-lg ${
            driftPercentage > 10 ? (isDarkMode ? 'bg-red-900/30' : 'bg-red-50') :
            driftPercentage > 5 ? (isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50') :
            (isDarkMode ? 'bg-green-900/30' : 'bg-green-50')
          }`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Current Drift Level</p>
            <p className={`text-3xl font-bold ${
              driftPercentage > 10 ? 'text-red-500' :
              driftPercentage > 5 ? 'text-yellow-500' :
              'text-green-500'
            }`}>
              {driftPercentage}%
            </p>
            <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
              {driftPercentage > 10 ? '⚠️ High drift detected' :
               driftPercentage > 5 ? '⚠️ Moderate drift detected' :
               '✓ Low drift level'}
            </p>
          </div>
        </div>

        <div className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-dark'}`}>Forecast Health</h3>
          <div className="space-y-3">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Forecasts</p>
              <p className="text-2xl font-bold text-blue-500">{forecasts.length}</p>
            </div>
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Feature Count</p>
              <p className="text-2xl font-bold text-purple-500">{features.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sample Predictions with Explanations */}
      <div className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-dark'}`}>Recent Forecast Explanations</h3>
        <div className="space-y-4">
          {sampleForecasts.map((forecast, index) => {
            const error = Math.abs(forecast.predictedOccupancy - forecast.actualOccupancy);
            const errorPercent = ((error / forecast.actualOccupancy) * 100).toFixed(2);
            const topFeature = topFeatures[0];

            return (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  error < 5
                    ? isDarkMode
                      ? 'bg-green-900/20 border-green-600'
                      : 'bg-green-50 border-green-500'
                    : error < 10
                    ? isDarkMode
                      ? 'bg-yellow-900/20 border-yellow-600'
                      : 'bg-yellow-50 border-yellow-500'
                    : isDarkMode
                    ? 'bg-red-900/20 border-red-600'
                    : 'bg-red-50 border-red-500'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {forecast.location} - {forecast.accommodationType}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    error < 5 
                      ? 'bg-green-600 text-white'
                      : error < 10
                      ? 'bg-yellow-600 text-white'
                      : 'bg-red-600 text-white'
                  }`}>
                    Error: {errorPercent}%
                  </span>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Actual: <span className="font-semibold">{forecast.actualOccupancy.toFixed(0)} rooms</span> | 
                  Predicted: <span className="font-semibold">{forecast.predictedOccupancy.toFixed(0)} rooms</span>
                </p>
                <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Top contributing feature: {topFeature?.name} ({(topFeature?.importance * 100).toFixed(2)}%)
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
