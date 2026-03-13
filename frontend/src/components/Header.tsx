import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';

interface HeaderProps {
  onSettingsClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSettingsClick }) => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <header className={`${isDarkMode ? 'white bg-slate-500 text-black' : 'bg-blue-600 text-white'} shadow-md`}>
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-bold">
            ML
          </div>
          <h1 className="text-2xl font-bold">Panglao Tourist Accommodation Demand Forecasting System</h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-lg transition ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-700'}`}
            title={isDarkMode ? 'Light mode' : 'Dark mode'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>

          <button
            onClick={onSettingsClick}
            className="px-4 py-2 bg-primary hover:bg-blue-600 rounded-lg transition font-medium"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>
    </header>
  );
};
