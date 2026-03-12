import { memo } from 'react';
import { APIEndpoint } from '../types';

interface MemoAPICardProps {
  endpoint: APIEndpoint;
  onCheck: (endpointId: string) => void;
}

export const MemoAPIEndpointCard = memo<MemoAPICardProps>(({ endpoint, onCheck }) => {
  return (
    /* Added 'border border-gray-200' and lowered shadow to 'shadow-sm' */
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:border-blue-300 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-dark">{endpoint.name}</h3>
          <p className="text-sm text-gray-600 break-all">{endpoint.url}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          endpoint.status === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {endpoint.status.charAt(0).toUpperCase() + endpoint.status.slice(1)}
        </span>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">Response Time</p>
          <p className="text-lg font-semibold text-primary">{endpoint.responseTime}ms</p>
        </div>
        <button
          onClick={() => onCheck(endpoint.id)}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600 transition-colors"
        >
          Check Status
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-4">
        Last check: {new Date(endpoint.lastCheck).toLocaleString()}
      </p>
    </div>
  );
});

MemoAPIEndpointCard.displayName = 'MemoAPIEndpointCard';