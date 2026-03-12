import React from 'react';
import { Toast, useToast } from '../contexts/ToastContext';

const getToastStyles = (type: Toast['type']) => {
  switch (type) {
    case 'success':
      return 'bg-green-500';
    case 'error':
      return 'bg-red-500';
    case 'warning':
      return 'bg-yellow-500';
    case 'info':
    default:
      return 'bg-blue-500';
  }
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 space-y-2 z-50">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`${getToastStyles(toast.type)} text-white px-6 py-3 rounded-lg shadow-lg flex items-center justify-between gap-4 min-w-[300px] animate-slide-in`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
