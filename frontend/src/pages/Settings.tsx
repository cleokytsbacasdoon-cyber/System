import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useDarkMode } from '../contexts/DarkModeContext';

interface Settings {
  driftThreshold: number;
  refreshInterval: number;
  alertSoundEnabled: boolean;
  autoResolveAlerts: boolean;
  metricsRetention: number;
}

interface SettingsPageProps {
  onClose?: () => void;
  asModal?: boolean;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onClose, asModal = false }) => {
  const { addToast } = useToast();
  const { isDarkMode } = useDarkMode();
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('appSettings');
    return saved ? JSON.parse(saved) : {
      driftThreshold: 15,
      refreshInterval: 30,
      alertSoundEnabled: true,
      autoResolveAlerts: false,
      metricsRetention: 1000,
    };
  });

  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    setHasChanges(false);
    addToast('Settings saved successfully', 'success');
  };

  const handleReset = () => {
    const defaults = {
      driftThreshold: 15,
      refreshInterval: 30,
      alertSoundEnabled: true,
      autoResolveAlerts: false,
      metricsRetention: 1000,
    };
    setSettings(defaults);
    localStorage.setItem('appSettings', JSON.stringify(defaults));
    setHasChanges(false);
    addToast('Settings reset to defaults', 'info');
  };

  return (
    <div className={`${asModal ? '' : `min-h-screen py-8 ${isDarkMode ? 'bg-slate-950' : 'bg-gray-50'}`} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      <div className={`${asModal ? 'w-full' : 'max-w-2xl mx-auto px-4'}`}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Settings</h1>
          {onClose && (
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-700 text-white hover:bg-slate-800'
                  : 'bg-white border-gray-300 text-black hover:bg-gray-100'
              }`}
            >
              Close
            </button>
          )}
        </div>

        <div className={`rounded-lg shadow-md p-8 space-y-6 border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
          {/* Drift Detection Settings */}
          <div className={`border-b pb-6 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
            <h2 className={`text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Drift Detection</h2>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Drift Threshold (%): {settings.driftThreshold}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={settings.driftThreshold}
                  onChange={(e) => handleChange('driftThreshold', parseInt(e.target.value))}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}
                />
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Alert will trigger when value changes by this percentage
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  <input
                    type="checkbox"
                    checked={settings.alertSoundEnabled}
                    onChange={(e) => handleChange('alertSoundEnabled', e.target.checked)}
                    className="mr-2"
                  />
                  Enable alert sounds
                </label>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  <input
                    type="checkbox"
                    checked={settings.autoResolveAlerts}
                    onChange={(e) => handleChange('autoResolveAlerts', e.target.checked)}
                    className="mr-2"
                  />
                  Auto-resolve old alerts after 24 hours
                </label>
              </div>
            </div>
          </div>

          {/* Dashboard Settings */}
          <div className={`border-b pb-6 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
            <h2 className={`text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Dashboard</h2>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Auto-refresh interval (seconds): {settings.refreshInterval}s
              </label>
              <input
                type="range"
                min="10"
                max="300"
                step="10"
                value={settings.refreshInterval}
                onChange={(e) => handleChange('refreshInterval', parseInt(e.target.value))}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}
              />
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Dashboard will refresh every {settings.refreshInterval} seconds
              </p>
            </div>
          </div>

          {/* Data Settings */}
          <div className="pb-6">
            <h2 className={`text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Data Management</h2>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Keep metrics for last: {settings.metricsRetention} records
              </label>
              <input
                type="range"
                min="100"
                max="5000"
                step="100"
                value={settings.metricsRetention}
                onChange={(e) => handleChange('metricsRetention', parseInt(e.target.value))}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}
              />
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Older metrics will be archived
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`flex-1 px-6 py-2 rounded font-medium transition ${
                hasChanges
                  ? 'bg-primary text-white hover:bg-blue-600'
                  : isDarkMode
                  ? 'bg-slate-700 text-gray-300 cursor-not-allowed'
                  : 'bg-gray-300 text-gray-600 cursor-not-allowed'
              }`}
            >
              Save Changes
            </button>
            <button
              onClick={handleReset}
              className={`flex-1 px-6 py-2 rounded font-medium transition ${
                isDarkMode
                  ? 'bg-slate-700 text-white hover:bg-slate-600'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        <div className={`mt-8 rounded-lg p-4 border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-sky-50 border-sky-200'}`}>
          <h3 className={`font-semibold mb-2 ${isDarkMode ? 'text-sky-300' : 'text-sky-900'}`}>Tip</h3>
          <p className={`text-sm ${isDarkMode ? 'text-sky-100' : 'text-sky-800'}`}>
            Settings are saved locally in your browser. They will persist even after closing and reopening the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
};
