import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';

interface Settings {
  driftThreshold: number;
  refreshInterval: number;
  alertSoundEnabled: boolean;
  autoResolveAlerts: boolean;
  metricsRetention: number;
}

export const SettingsPage: React.FC = () => {
  const { addToast } = useToast();
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

  const handleChange = (key: keyof Settings, value: any) => {
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-dark mb-8">Settings</h1>

        <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
          {/* Drift Detection Settings */}
          <div className="border-b pb-6">
            <h2 className="text-2xl font-semibold text-dark mb-4">Drift Detection</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Drift Threshold (%): {settings.driftThreshold}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={settings.driftThreshold}
                  onChange={(e) => handleChange('driftThreshold', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Alert will trigger when value changes by this percentage
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
          <div className="border-b pb-6">
            <h2 className="text-2xl font-semibold text-dark mb-4">Dashboard</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-refresh interval (seconds): {settings.refreshInterval}s
              </label>
              <input
                type="range"
                min="10"
                max="300"
                step="10"
                value={settings.refreshInterval}
                onChange={(e) => handleChange('refreshInterval', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-600 mt-1">
                Dashboard will refresh every {settings.refreshInterval} seconds
              </p>
            </div>
          </div>

          {/* Data Settings */}
          <div className="pb-6">
            <h2 className="text-2xl font-semibold text-dark mb-4">Data Management</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keep metrics for last: {settings.metricsRetention} records
              </label>
              <input
                type="range"
                min="100"
                max="5000"
                step="100"
                value={settings.metricsRetention}
                onChange={(e) => handleChange('metricsRetention', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-600 mt-1">
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
                  : 'bg-gray-300 text-gray-600 cursor-not-allowed'
              }`}
            >
              Save Changes
            </button>
            <button
              onClick={handleReset}
              className="flex-1 px-6 py-2 bg-gray-200 text-gray-800 rounded font-medium hover:bg-gray-300 transition"
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Tip</h3>
          <p className="text-blue-800 text-sm">
            Settings are saved locally in your browser. They will persist even after closing and reopening the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
};
