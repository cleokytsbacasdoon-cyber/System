import axios from 'axios';
import { ForecastMetrics, DemandAlert, RetrainingJob, APIEndpoint, ModelVersion, DataQuality, DemandForecast, FeatureImportance, ForecastInsights, PhilippineHoliday, MonthlyTourismDatasetRecord, Top10MarketHolidayRecord } from '../types';
import { mockApi } from './mockApi';

// Backend-first by default. Set VITE_USE_MOCK_API=true to force local mock mode.
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Forecast Metrics APIs
export const getForecastMetrics = async (): Promise<ForecastMetrics[]> => {
  if (USE_MOCK_API) return mockApi.getForecastMetrics();
  const response = await apiClient.get('/metrics/forecasts');
  return response.data;
};

export const getForecastMetricsById = async (modelId: string): Promise<ForecastMetrics> => {
  if (USE_MOCK_API) {
    const metrics = await mockApi.getForecastMetrics();
    return metrics.find(m => m.id === modelId) || metrics[0];
  }
  const response = await apiClient.get(`/metrics/forecasts/${modelId}`);
  return response.data;
};

// Demand Alert APIs
export const getDemandAlerts = async (): Promise<DemandAlert[]> => {
  if (USE_MOCK_API) return mockApi.getDemandAlerts();
  const response = await apiClient.get('/alerts/demand');
  return response.data;
};

export const resolveDemandAlert = async (alertId: string): Promise<DemandAlert> => {
  if (USE_MOCK_API) return mockApi.resolveDemandAlert(alertId);
  const response = await apiClient.put(`/alerts/demand/${alertId}/resolve`);
  return response.data;
};

// Retraining APIs
export const getRetrainingJobs = async (): Promise<RetrainingJob[]> => {
  if (USE_MOCK_API) return mockApi.getRetrainingJobs();
  const response = await apiClient.get('/retraining/jobs');
  return response.data;
};

export const startRetrainingJob = async (modelId: string): Promise<RetrainingJob> => {
  if (USE_MOCK_API) return mockApi.startRetrainingJob(modelId);
  const response = await apiClient.post('/retraining/jobs', { modelId });
  return response.data;
};

export const getRetrainingJobStatus = async (jobId: string): Promise<RetrainingJob> => {
  if (USE_MOCK_API) return mockApi.getRetrainingJobStatus(jobId);
  const response = await apiClient.get(`/retraining/jobs/${jobId}`);
  return response.data;
};

// API Endpoint APIs
export const getAPIEndpoints = async (): Promise<APIEndpoint[]> => {
  if (USE_MOCK_API) return mockApi.getAPIEndpoints();
  const response = await apiClient.get('/api/endpoints');
  return response.data;
};

export const checkEndpointStatus = async (endpointId: string): Promise<APIEndpoint> => {
  if (USE_MOCK_API) return mockApi.checkEndpointStatus(endpointId);
  const response = await apiClient.post(`/api/endpoints/${endpointId}/check`);
  return response.data;
};

// Model Registry APIs
export const getModelVersions = async (): Promise<ModelVersion[]> => {
  if (USE_MOCK_API) return mockApi.getModelVersions();
  const response = await apiClient.get('/models/versions');
  return response.data;
};

export const deployModelVersion = async (versionId: string): Promise<ModelVersion> => {
  if (USE_MOCK_API) return mockApi.deployModelVersion(versionId);
  const response = await apiClient.post(`/models/versions/${versionId}/deploy`);
  return response.data;
};

export const rollbackModelVersion = async (versionId: string): Promise<ModelVersion> => {
  if (USE_MOCK_API) return mockApi.rollbackModelVersion(versionId);
  const response = await apiClient.post(`/models/versions/${versionId}/rollback`);
  return response.data;
};

// Data Quality APIs
export const getDataQuality = async (): Promise<DataQuality> => {
  if (USE_MOCK_API) return mockApi.getDataQuality();
  const response = await apiClient.get('/data/quality');
  return response.data;
};

// Demand Prediction APIs
export const getDemandForecasts = async (): Promise<DemandForecast[]> => {
  if (USE_MOCK_API) return mockApi.getDemandForecasts();
  const response = await apiClient.get('/forecasts');
  return response.data;
};

export const getMonthlyTourismDataset = async (
  params?: { year?: number; month?: number }
): Promise<MonthlyTourismDatasetRecord[]> => {
  if (USE_MOCK_API) return mockApi.getMonthlyTourismDataset(params);
  const response = await apiClient.get('/datasets/tourism/monthly', { params });
  return response.data;
};

export const getTop10MarketHolidays = async (
  params?: { year?: number; month?: number }
): Promise<Top10MarketHolidayRecord[]> => {
  if (USE_MOCK_API) return mockApi.getTop10MarketHolidays(params);
  const response = await apiClient.get('/datasets/tourism/top10-market-holidays', { params });
  return response.data;
};

// Feature Importance APIs
export const getFeatureImportance = async (): Promise<FeatureImportance[]> => {
  if (USE_MOCK_API) return mockApi.getFeatureImportance();
  const response = await apiClient.get('/models/features/importance');
  return response.data;
};

// Forecast Insights APIs
export const getForecastInsights = async (): Promise<ForecastInsights> => {
  if (USE_MOCK_API) return mockApi.getForecastInsights();
  const response = await apiClient.get('/forecasts/insights');
  return response.data;
};

// Philippine Holiday API (Calendarific via backend)
export const getPhilippineHolidays = async (year: number, month?: number): Promise<PhilippineHoliday[]> => {
  if (USE_MOCK_API) return mockApi.getPhilippineHolidays(year, month);
  const response = await apiClient.get('/holidays/philippines', {
    params: {
      year,
      ...(month ? { month } : {}),
    },
  });
  return response.data.holidays || [];
};

// Aliases for Dashboard compatibility
export { getForecastMetrics as getModelMetrics };
export { getDemandAlerts as getDriftAlerts };
export { resolveDemandAlert as resolveDriftAlert };

export default apiClient;
