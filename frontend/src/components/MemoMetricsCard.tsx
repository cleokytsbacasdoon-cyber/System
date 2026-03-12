import React, { memo } from 'react';
import { ModelMetrics } from '../types';

interface MemoMetricsCardProps {
  metric: ForecastMetrics;
}

export const MemoMetricsCard = memo<MemoMetricsCardProps>(({ metric }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-primary">
      <h3 className="text-lg font-semibold text-dark mb-4">Forecast Accuracy Metrics</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">MAPE</p>
          <p className="text-2xl font-bold text-primary">{metric.mape.toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">RMSE</p>
          <p className="text-2xl font-bold text-primary">{metric.rmse.toFixed(2)} rooms</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">MAE</p>
          <p className="text-2xl font-bold text-secondary">{metric.mae.toFixed(2)} rooms</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">R² Score</p>
          <p className="text-2xl font-bold text-secondary">{metric.r2Score.toFixed(3)}</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-4">
        Last updated: {new Date(metric.timestamp).toLocaleString()}
      </p>
    </div>
  );
});

MemoMetricsCard.displayName = 'MemoMetricsCard';
