import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { APIEndpoint } from '../types';

interface APIEndpointCardProps {
  endpoint: APIEndpoint;
  onCheck: (endpointId: string) => void;
}

export const APIEndpointCard: React.FC<APIEndpointCardProps> = ({ endpoint, onCheck }) => {
  const { isDarkMode } = useDarkMode();

  return (
    <div className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-dark'}`}>{endpoint.name}</h3>
          <p className={`text-sm break-all ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{endpoint.url}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          endpoint.status === 'active' 
            ? isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
            : isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
        }`}>
          {endpoint.status.charAt(0).toUpperCase() + endpoint.status.slice(1)}
        </span>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Response Time</p>
          <p className="text-lg font-semibold text-primary">{endpoint.responseTime}ms</p>
        </div>
        <button
          onClick={() => onCheck(endpoint.id)}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600"
        >
          Check Status
        </button>
      </div>
      <p className={`text-xs mt-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
        Last check: {new Date(endpoint.lastCheck).toLocaleString()}
      </p>
    </div>
  );
};
