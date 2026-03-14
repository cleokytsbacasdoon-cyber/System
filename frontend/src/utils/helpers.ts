// Local Storage utilities
export const storageUtils = {
  setItem: (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save to localStorage:`, error);
    }
  },

  getItem: <T,>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch (error) {
      console.error(`Failed to read from localStorage:`, error);
      return defaultValue || null;
    }
  },

  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove from localStorage:`, error);
    }
  },

  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error(`Failed to clear localStorage:`, error);
    }
  },
};

// Number formatting utilities
export const formatUtils = {
  percentage: (value: number, decimals: number = 2): string => {
    return (value * 100).toFixed(decimals) + '%';
  },

  decimal: (value: number, decimals: number = 2): string => {
    return value.toFixed(decimals);
  },

  milliseconds: (value: number): string => {
    if (value < 1000) return `${value}ms`;
    return `${(value / 1000).toFixed(2)}s`;
  },
};

// Date utilities
export const dateUtils = {
  format: (date: string | Date, locale: string = 'en-US'): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString(locale);
  },

  fromNow: (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const seconds = Math.floor((new Date().getTime() - d.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  },
};

// Array utilities
export const arrayUtils = {
  groupBy: <T,>(array: T[], key: keyof T): Record<string, T[]> => {
    return array.reduce((result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) result[groupKey] = [];
      result[groupKey].push(item);
      return result;
    }, {} as Record<string, T[]>);
  },

  sortBy: <T,>(array: T[], key: keyof T, ascending: boolean = true): T[] => {
    return [...array].sort((a, b) => {
      if (a[key] < b[key]) return ascending ? -1 : 1;
      if (a[key] > b[key]) return ascending ? 1 : -1;
      return 0;
    });
  },

  unique: <T,>(array: T[], key?: keyof T): T[] => {
    if (!key) return [...new Set(array)];
    return Array.from(
      new Map(array.map(item => [item[key], item])).values()
    );
  },
};
