import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { DataQuality } from '../types';

interface DataQualityDashboardProps {
  quality: DataQuality;
}

const CircularGauge: React.FC<{ value: number; label: string; isDarkMode: boolean }> = ({ value, label, isDarkMode }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? '#10B981' : value >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" className="transform -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke={isDarkMode ? '#374151' : '#e5e7eb'} strokeWidth="4" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <p className={`text-lg font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-dark'}`}>{value}%</p>
      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}</p>
    </div>
  );
};

export const DataQualityDashboard: React.FC<DataQualityDashboardProps> = ({ quality }) => {
  const { isDarkMode } = useDarkMode();

  return (
    <div className="space-y-6">
      {/* Quality Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`rounded-lg shadow-md p-6 flex justify-center ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
          <CircularGauge value={quality.completeness} label="Completeness" isDarkMode={isDarkMode} />
        </div>

        <div className={`rounded-lg shadow-md p-6 flex justify-center ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
          <CircularGauge value={quality.freshness} label="Freshness" isDarkMode={isDarkMode} />
        </div>

        <div className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
          <div className="flex flex-col items-center justify-center h-full">
            <div className={`text-3xl font-bold mb-2 ${
              quality.schemaValid ? 'text-green-500' : 'text-red-500'
            }`}>
              {quality.schemaValid ? '✓' : '✗'}
            </div>
            <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-dark'}`}>
              Schema Validation
            </p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {quality.schemaValid ? 'Valid' : 'Invalid'}
            </p>
          </div>
        </div>
      </div>

      {/* Data Details */}
      <div className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-dark'}`}>Data Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Records Processed</p>
            <p className={`text-2xl font-bold text-blue-500`}>{quality.recordsProcessed.toLocaleString()}</p>
          </div>
          <div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Last Updated</p>
            <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {new Date(quality.lastUpdate).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
