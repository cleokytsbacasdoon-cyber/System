import React from 'react';

export const LoadingSkeleton: React.FC<{ count?: number; height?: string }> = ({ 
  count = 3, 
  height = 'h-20' 
}) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${height} bg-gray-200 rounded-lg animate-pulse`}
        />
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
      <div className="h-12 bg-gray-200 rounded"></div>
    </div>
  );
};

export const ChartSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
      <div className="flex gap-4 justify-center">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
    </div>
  );
};
