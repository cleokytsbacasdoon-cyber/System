import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { RetrainingJob } from '../types';

interface RetrainingJobCardProps {
  job: RetrainingJob;
  onRetrain: (modelName: string) => void;
}

export const RetrainingJobCard: React.FC<RetrainingJobCardProps> = ({ job, onRetrain }) => {
  const { isDarkMode } = useDarkMode();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800';
      case 'running':
        return isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800';
      case 'pending':
        return isDarkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800';
      default:
        return isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`rounded-lg shadow-md p-6 h-full flex flex-col ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-dark'}`}>{job.modelName || job.modelId || 'xgboost_base'}</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
        </span>
      </div>
      
      <div className="space-y-2">
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Start: {new Date(job.startTime).toLocaleString()}
        </p>
        {job.endTime && (
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            End: {new Date(job.endTime).toLocaleString()}
          </p>
        )}
        {job.accuracy !== undefined && (
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Accuracy: <span className="font-semibold">{(job.accuracy * 100).toFixed(2)}%</span>
          </p>
        )}
        {job.errorMessage && (
          <p className="text-sm text-red-600">Error: {job.errorMessage}</p>
        )}
      </div>

      <button
        onClick={() => onRetrain(job.modelName || job.modelId || 'xgboost_base')}
        className="mt-auto pt-4 w-full px-4 py-2 bg-primary text-white rounded hover:bg-blue-600 flex items-center justify-center text-center"
      >
        Start New Retraining
      </button>
    </div>
  );
};
