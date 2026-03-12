import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { ModelVersion } from '../types';

interface ModelRegistryProps {
  versions: ModelVersion[];
}

export const ModelRegistry: React.FC<ModelRegistryProps> = ({ versions }) => {
  const { isDarkMode } = useDarkMode();

  return (
    <div className="space-y-6">
      {/* Version Timeline */}
      <div className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-dark'}`}>Version Timeline</h3>
        <div className="space-y-3">
          {versions.map((version) => (
            <div key={version.id} className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
              version.status === 'active' 
                ? isDarkMode ? 'bg-green-900 border-green-600' : 'bg-green-50 border-green-500'
                : isDarkMode ? 'bg-slate-700 border-gray-600' : 'bg-gray-50 border-gray-300'
            }`}>
              <div className="flex-1">
                <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-dark'}`}>
                  {version.version}
                  {version.status === 'active' && <span className="ml-2 px-2 py-1 text-xs bg-green-500 text-white rounded">ACTIVE</span>}
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Deployed: {new Date(version.deployDate).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-blue-500">Accuracy: {(version.accuracy * 100).toFixed(2)}%</p>
                <button className={`mt-2 px-3 py-1 text-sm rounded transition ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}>
                  {version.status === 'active' ? 'Rollback' : 'Deploy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Comparison Matrix */}
      <div className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-dark'}`}>Performance Comparison</h3>
        <div className="overflow-x-auto">
          <table className={`w-full text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <thead>
              <tr className={isDarkMode ? 'border-b border-gray-600' : 'border-b border-gray-300'}>
                <th className="text-left py-2 px-3">Version</th>
                <th className="text-center py-2 px-3">Accuracy</th>
                <th className="text-center py-2 px-3">Precision</th>
                <th className="text-center py-2 px-3">Recall</th>
                <th className="text-center py-2 px-3">F1 Score</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((version) => (
                <tr key={version.id} className={isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-200'}>
                  <td className="py-2 px-3">{version.version}</td>
                  <td className="text-center py-2 px-3">{(version.accuracy * 100).toFixed(2)}%</td>
                  <td className="text-center py-2 px-3">{(version.precision * 100).toFixed(2)}%</td>
                  <td className="text-center py-2 px-3">{(version.recall * 100).toFixed(2)}%</td>
                  <td className="text-center py-2 px-3">{((version.accuracy + version.precision + version.recall) / 3 * 100).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
