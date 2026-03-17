export interface ForecastMetrics {
  id: string;
  mape: number;        // Mean Absolute Percentage Error
  rmse: number;        // Root Mean Squared Error
  mae: number;         // Mean Absolute Error
  r2Score: number;     // R-squared
  timestamp: string;
}

export interface DemandAlert {
  id: string;
  modelId: string;
  title?: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: string;
  resolved: boolean;
  alertType?: 'seasonality' | 'trend' | 'anomaly' | 'drift';
}

export interface RetrainingJob {
  id: string;
  modelId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  accuracy?: number;
  errorMessage?: string;
}

export interface APIEndpoint {
  id: string;
  name: string;
  url: string;
  status: 'active' | 'inactive';
  responseTime: number;
  lastCheck: string;
}

export interface ModelVersion {
  id: string;
  version: string;
  deployDate: string;
  accuracy: number;
  precision: number;
  recall: number;
  status: 'active' | 'archived';
}

export interface DataQuality {
  id: string;
  completeness: number;
  schemaValid: boolean;
  freshness: number;
  lastUpdate: string;
  recordsProcessed: number;
}

export interface DemandForecast {
  id: string;
  actualOccupancy: number;      // Actual rooms occupied
  predictedOccupancy: number;   // Forecasted rooms
  error: number;
  date: string;
  location?: string;
  accommodationType?: string;
}

export interface FeatureImportance {
  name: string;          // e.g., 'seasonality', 'events', 'price', 'weather'
  importance: number;
  category?: 'temporal' | 'economic' | 'external' | 'historical';
}

export interface PhilippineHoliday {
  name: string;
  description: string;
  date: string;
  month: number;
  day: number;
  type: string[];
  primaryType: string;
}

export interface ForecastInsights {
  topFeatures: FeatureImportance[];
  featureDrift: { [key: string]: number };
  sampleForecasts: DemandForecast[];
  seasonalTrends?: { month: string; avgOccupancy: number }[];
}

export interface DashboardData {
  forecastMetrics: ForecastMetrics[];
  demandAlerts: DemandAlert[];
  retrainingJobs: RetrainingJob[];
  apiEndpoints: APIEndpoint[];
}

// Type aliases for Dashboard compatibility
export type ModelMetrics = ForecastMetrics;
export type DriftAlert = DemandAlert;
