import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';

interface TabItem {
  id: string;
  label: string;
}

interface TabGroup {
  category: string;
  tabs: TabItem[];
}

interface TabNavigationProps {
  activeTab: string;
  tabGroups: TabGroup[];
  onTabChange: (tabId: string) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, tabGroups, onTabChange }) => {
  const { isDarkMode } = useDarkMode();
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(
    tabGroups[0]?.category || null
  );

  // Find which category the current tab belongs to
  React.useEffect(() => {
    const category = tabGroups.find(group =>
      group.tabs.some(tab => tab.id === activeTab)
    )?.category;
    if (category) {
      setExpandedCategory(category);
    }
  }, [activeTab, tabGroups]);

  return (
    <div className={`rounded-lg shadow-md mb-6 overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
      {/* Category Navigation */}
      <div className={`flex flex-wrap gap-2 p-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        {tabGroups.map((group) => (
          <button
            key={group.category}
            onClick={() => setExpandedCategory(expandedCategory === group.category ? null : group.category)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              expandedCategory === group.category
                ? isDarkMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-500 text-white'
                : isDarkMode
                ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {group.category}
            <span className="ml-2 text-sm">
              {expandedCategory === group.category ? '▼' : '▶'}
            </span>
          </button>
        ))}
      </div>

      {/* Sub-tabs for Active Category */}
      {expandedCategory && (
        <div className={`flex flex-wrap gap-2 p-4 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
          {tabGroups
            .find(g => g.category === expandedCategory)
            ?.tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-3 py-2 rounded text-sm font-medium transition ${
                  activeTab === tab.id
                    ? isDarkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : isDarkMode
                    ? 'text-gray-300 hover:text-white'
                    : 'text-gray-600 hover:text-dark'
                }`}
              >
                {tab.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
};
