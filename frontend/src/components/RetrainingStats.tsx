import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { RetrainingJob } from '../types';

interface RetrainingStatsProps {
  jobs: RetrainingJob[];
}

export const RetrainingStats: React.FC<RetrainingStatsProps> = ({ jobs }) => {
  const { isDarkMode } = useDarkMode();
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const runningJobs = jobs.filter(j => j.status === 'running').length;
  
  const avgAccuracy = jobs
    .filter(j => j.accuracy)
    .reduce((sum, j) => sum + (j.accuracy || 0), 0) / Math.max(completedJobs, 1);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className={`rounded-lg shadow p-4 border-l-4 border-blue-500 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Jobs</p>
        <p className="text-3xl font-bold text-blue-500">{totalJobs}</p>
      </div>
      
      <div className={`rounded-lg shadow p-4 border-l-4 border-green-500 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Completed</p>
        <p className="text-3xl font-bold text-green-500">{completedJobs}</p>
      </div>
      
      <div className={`rounded-lg shadow p-4 border-l-4 border-yellow-500 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Running</p>
        <p className="text-3xl font-bold text-yellow-500">{runningJobs}</p>
      </div>
      
      <div className={`rounded-lg shadow p-4 border-l-4 border-red-500 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Accuracy</p>
        <p className="text-3xl font-bold text-red-500">{(avgAccuracy * 100).toFixed(1)}%</p>
      </div>
    </div>
  );
};
