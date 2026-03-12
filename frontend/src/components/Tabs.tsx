import React from 'react';

interface TabsProps {
  activeTab: string;
  tabs: { id: string; label: string }[];
  onTabChange: (tabId: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ activeTab, tabs, onTabChange }) => {
  return (
    <div className="flex justify-center border border-transparent rounded mb-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-3 font-medium transition border border-gray-300 rounded mx-1 ${
            activeTab === tab.id
              ? 'border-primary text-primary'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
