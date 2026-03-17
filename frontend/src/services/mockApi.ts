import { v4 as uuidv4 } from 'uuid';
import { ForecastMetrics, DemandAlert, RetrainingJob, APIEndpoint, ModelVersion, DataQuality, DemandForecast, FeatureImportance, ForecastInsights, PhilippineHoliday } from '../types';

const getStaticPhilippineHolidays = (year: number): PhilippineHoliday[] => {
  const holidays: PhilippineHoliday[] = [
    { name: "New Year's Day", description: 'Regular Holiday', date: `${year}-01-01`, month: 1, day: 1, type: ['National holiday'], primaryType: 'National holiday' },
    { name: 'EDSA Revolution Anniversary', description: 'Special Non-working Day', date: `${year}-02-25`, month: 2, day: 25, type: ['Observance'], primaryType: 'Observance' },
    { name: 'Araw ng Kagitingan', description: 'Regular Holiday', date: `${year}-04-09`, month: 4, day: 9, type: ['National holiday'], primaryType: 'National holiday' },
    { name: 'Labor Day', description: 'Regular Holiday', date: `${year}-05-01`, month: 5, day: 1, type: ['National holiday'], primaryType: 'National holiday' },
    { name: 'Independence Day', description: 'Regular Holiday', date: `${year}-06-12`, month: 6, day: 12, type: ['National holiday'], primaryType: 'National holiday' },
    { name: 'Ninoy Aquino Day', description: 'Special Non-working Day', date: `${year}-08-21`, month: 8, day: 21, type: ['Observance'], primaryType: 'Observance' },
    { name: 'National Heroes Day', description: 'Regular Holiday', date: `${year}-08-25`, month: 8, day: 25, type: ['National holiday'], primaryType: 'National holiday' },
    { name: "All Saints' Day", description: 'Special Non-working Day', date: `${year}-11-01`, month: 11, day: 1, type: ['Observance'], primaryType: 'Observance' },
    { name: 'Bonifacio Day', description: 'Regular Holiday', date: `${year}-11-30`, month: 11, day: 30, type: ['National holiday'], primaryType: 'National holiday' },
    { name: 'Christmas Day', description: 'Regular Holiday', date: `${year}-12-25`, month: 12, day: 25, type: ['National holiday'], primaryType: 'National holiday' },
    { name: 'Rizal Day', description: 'Regular Holiday', date: `${year}-12-30`, month: 12, day: 30, type: ['National holiday'], primaryType: 'National holiday' },
  ];

  return holidays;
};

const ALERT_MODEL_ID = 'model-1';

const createAlert = (
  partial: Omit<DemandAlert, 'id' | 'modelId'>,
  existingAlerts: DemandAlert[]
): DemandAlert => {
  const existingMatch = existingAlerts.find(
    (alert) => alert.title === partial.title && alert.message === partial.message
  );

  return {
    id: existingMatch?.id || uuidv4(),
    modelId: ALERT_MODEL_ID,
    ...partial,
    resolved: existingMatch?.resolved ?? partial.resolved,
  };
};

const buildSystemAlerts = (
  forecasts: DemandForecast[],
  endpoints: APIEndpoint[],
  existingAlerts: DemandAlert[] = []
): DemandAlert[] => {
  const nextAlerts: DemandAlert[] = [];
  const latestForecast = forecasts[forecasts.length - 1];

  if (latestForecast) {
    const latestDate = new Date(latestForecast.date).toLocaleString('default', {
      month: 'long',
      year: 'numeric',
      day: 'numeric',
    });

    nextAlerts.push(
      createAlert(
        {
          title: 'Data Status',
          severity: 'low',
          message: `New tourist accommodation data detected for ${latestDate}.`,
          threshold: 1,
          currentValue: 1,
          timestamp: latestForecast.date,
          resolved: false,
          alertType: 'trend',
        },
        existingAlerts
      )
    );
  }

  const latestDriftRecord = [...forecasts]
    .reverse()
    .find((forecast) => forecast.actualOccupancy > 0 && Math.abs(forecast.predictedOccupancy - forecast.actualOccupancy) / forecast.actualOccupancy >= 0.5);

  if (latestDriftRecord) {
    const driftRatio = Math.abs(latestDriftRecord.predictedOccupancy - latestDriftRecord.actualOccupancy) / latestDriftRecord.actualOccupancy;
    const driftDate = new Date(latestDriftRecord.date).toLocaleString('default', {
      month: 'long',
      year: 'numeric',
      day: 'numeric',
    });

    nextAlerts.push(
      createAlert(
        {
          title: 'Drift Status',
          severity: 'high',
          message: `Drift detected on ${driftDate}: actual and predicted tourist data differ by ${Math.round(driftRatio * 100)}%.`,
          threshold: 0.5,
          currentValue: Number(driftRatio.toFixed(2)),
          timestamp: latestDriftRecord.date,
          resolved: false,
          alertType: 'drift',
        },
        existingAlerts
      )
    );
  }

  endpoints
    .forEach((endpoint) => {
      nextAlerts.push(
        createAlert(
          {
            title: 'API Status',
            severity: endpoint.status === 'active' ? 'low' : 'high',
            message:
              endpoint.status === 'active'
                ? `API connected successfully: ${endpoint.name}.`
                : `API connection unsuccessful: ${endpoint.name} disconnected from the system.`,
            threshold: 1,
            currentValue: endpoint.status === 'active' ? 1 : 0,
            timestamp: endpoint.lastCheck,
            resolved: false,
            alertType: 'anomaly',
          },
          existingAlerts
        )
      );
    });

  return nextAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

// Generate sample forecast accuracy metrics
const generateSampleMetrics = (): ForecastMetrics[] => {
  const metrics: ForecastMetrics[] = [];
  for (let i = 0; i < 10; i++) {
    metrics.push({
      id: uuidv4(),
      mape: 5 + Math.random() * 8,        // MAPE: 5-13%
      rmse: 10 + Math.random() * 15,      // RMSE: 10-25 rooms
      mae: 8 + Math.random() * 12,        // MAE: 8-20 rooms
      r2Score: 0.82 + Math.random() * 0.15, // R²: 0.82-0.97
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    });
  }
  return metrics.reverse();
};

const generateSampleJobs = (): RetrainingJob[] => [
  {
    id: uuidv4(),
    modelId: 'model-1',
    status: 'completed',
    startTime: new Date(Date.now() - 7200000).toISOString(),
    endTime: new Date(Date.now() - 3600000).toISOString(),
    accuracy: 0.93,
  },
  {
    id: uuidv4(),
    modelId: 'model-2',
    status: 'running',
    startTime: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: uuidv4(),
    modelId: 'model-3',
    status: 'pending',
    startTime: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    modelId: 'model-4',
    status: 'completed',
    startTime: new Date(Date.now() - 10800000).toISOString(),
    endTime: new Date(Date.now() - 9000000).toISOString(),
    accuracy: 0.91,
  },
];

const generateSampleEndpoints = (): APIEndpoint[] => [
  {
    id: uuidv4(),
    name: 'Demand Forecast API',
    url: 'http://localhost:8000/forecast',
    status: 'active',
    responseTime: 145,
    lastCheck: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: 'Booking Data Pipeline',
    url: 'http://localhost:8000/bookings',
    status: 'active',
    responseTime: 89,
    lastCheck: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: 'Historical Data Service',
    url: 'http://localhost:5000/historical',
    status: 'inactive',
    responseTime: 0,
    lastCheck: new Date(Date.now() - 7200000).toISOString(),
  },
];

const generateSampleModelVersions = (): ModelVersion[] => [
  {
    id: uuidv4(),
    version: 'model-1-v1.2.3',
    deployDate: new Date(Date.now() - 30 * 86400000).toISOString(),
    accuracy: 0.92,
    precision: 0.90,
    recall: 0.92,
    status: 'archived',
  },
  {
    id: uuidv4(),
    version: 'model-2-v1.3.0',
    deployDate: new Date(Date.now() - 14 * 86400000).toISOString(),
    accuracy: 0.94,
    precision: 0.93,
    recall: 0.94,
    status: 'archived',
  },
  {
    id: uuidv4(),
    version: 'model-3-v1.3.5',
    deployDate: new Date(Date.now() - 7 * 86400000).toISOString(),
    accuracy: 0.95,
    precision: 0.94,
    recall: 0.95,
    status: 'archived',
  },
  {
    id: uuidv4(),
    version: 'model-4-v1.4.1',
    deployDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    accuracy: 0.96,
    precision: 0.95,
    recall: 0.96,
    status: 'active',
  },
];

const generateSampleDataQuality = (): DataQuality => ({
  id: uuidv4(),
  completeness: 96.8,
  schemaValid: true,
  freshness: 91.5,
  lastUpdate: new Date().toISOString(),
  recordsProcessed: 245000,  // Booking records
});

// Generate tourism demand forecasts
const generateSampleForecasts = (): DemandForecast[] => {
  const forecasts: DemandForecast[] = [];
  const locations = ['Beach Resort', 'City Hotel', 'Mountain Lodge', 'Urban AirBnB'];
  const accommodationTypes = ['Hotel', 'Resort', 'Hostel', 'Vacation Rental'];
  
  for (let i = 0; i < 50; i++) {
    const baseOccupancy = 60 + Math.random() * 80;  // 60-140 rooms
    const seasonalFactor = Math.sin((i / 50) * Math.PI) * 20; // Seasonal variation
    const actualOccupancy = Math.max(10, baseOccupancy + seasonalFactor);
    const predictedOccupancy = i === 0
      ? actualOccupancy * 1.55
      : actualOccupancy + (Math.random() - 0.5) * 15;
    
    forecasts.push({
      id: uuidv4(),
      actualOccupancy: Number(actualOccupancy.toFixed(1)),
      predictedOccupancy: Number(predictedOccupancy.toFixed(1)),
      error: Number(Math.abs(predictedOccupancy - actualOccupancy).toFixed(1)),
      date: new Date(Date.now() - i * 86400000).toISOString(),
      location: locations[i % locations.length],
      accommodationType: accommodationTypes[i % accommodationTypes.length],
    });
  }
  return forecasts.reverse();
};

const generateSampleFeatures = (): FeatureImportance[] => {
  const tourismFeatures = [
    { name: 'Seasonality', category: 'temporal' as const, baseImportance: 0.25 },
    { name: 'Day of Week', category: 'temporal' as const, baseImportance: 0.18 },
    { name: 'Local Events', category: 'external' as const, baseImportance: 0.15 },
    { name: 'Price Level', category: 'economic' as const, baseImportance: 0.12 },
    { name: 'Weather Forecast', category: 'external' as const, baseImportance: 0.10 },
    { name: 'Historical Trend', category: 'historical' as const, baseImportance: 0.08 },
    { name: 'Competition Index', category: 'economic' as const, baseImportance: 0.05 },
    { name: 'Transportation', category: 'external' as const, baseImportance: 0.03 },
    { name: 'School Holidays', category: 'temporal' as const, baseImportance: 0.02 },
    { name: 'Marketing Spend', category: 'economic' as const, baseImportance: 0.02 },
  ];

  return tourismFeatures.map((feature) => ({
    name: feature.name,
    importance: feature.baseImportance + Math.random() * 0.03,
    category: feature.category,
  })).sort((a, b) => b.importance - a.importance);
};

const generateSampleForecastInsights = (): ForecastInsights => ({
  topFeatures: generateSampleFeatures(),
  featureDrift: {
    'Seasonality': Math.random() * 3,
    'Day of Week': Math.random() * 2,
    'Local Events': Math.random() * 5,
    'Price Level': Math.random() * 4,
    'Weather Forecast': Math.random() * 6,
  },
  sampleForecasts: generateSampleForecasts().slice(-5),
});

// Mock data storage
let mockMetrics = generateSampleMetrics();
const mockJobs = generateSampleJobs();
const mockEndpoints = generateSampleEndpoints();
const mockModelVersions = generateSampleModelVersions();
const mockDataQuality = generateSampleDataQuality();
let mockForecasts = generateSampleForecasts();
const mockFeatures = generateSampleFeatures();
const mockForecastInsights = generateSampleForecastInsights();
let mockAlerts = buildSystemAlerts(mockForecasts, mockEndpoints);

// Simulate real-time data updates
setInterval(() => {
  // Add new forecast metric every 30 seconds
  const newMetric: ForecastMetrics = {
    id: uuidv4(),
    mape: 5 + Math.random() * 8,
    rmse: 10 + Math.random() * 15,
    mae: 8 + Math.random() * 12,
    r2Score: 0.82 + Math.random() * 0.15,
    timestamp: new Date().toISOString(),
  };
  mockMetrics.push(newMetric);
  
  // Keep only last 100 metrics
  if (mockMetrics.length > 100) {
    mockMetrics = mockMetrics.slice(-100);
  }

  const baseOccupancy = 60 + Math.random() * 80;
  const predictedVariance = Math.random() > 0.7 ? 0.55 : 0.18;
  const actualOccupancy = Number(baseOccupancy.toFixed(1));
  const predictedOccupancy = Number((baseOccupancy * (1 + predictedVariance)).toFixed(1));
  const latestForecastDate = new Date();

  mockForecasts.push({
    id: uuidv4(),
    actualOccupancy,
    predictedOccupancy,
    error: Number(Math.abs(predictedOccupancy - actualOccupancy).toFixed(1)),
    date: latestForecastDate.toISOString(),
    location: 'Tourist Accommodation Data',
    accommodationType: 'Hotel',
  });

  if (mockForecasts.length > 100) {
    mockForecasts = mockForecasts.slice(-100);
  }

  // Simulate running job completion
  const runningJob = mockJobs.find(j => j.status === 'running');
  if (runningJob && Math.random() > 0.8) {
    runningJob.status = 'completed';
    runningJob.endTime = new Date().toISOString();
    runningJob.accuracy = 0.92 + Math.random() * 0.05;
  }

  // Move pending to running
  const pendingJob = mockJobs.find(j => j.status === 'pending');
  if (pendingJob && Math.random() > 0.9) {
    pendingJob.status = 'running';
  }

  mockAlerts = buildSystemAlerts(mockForecasts, mockEndpoints, mockAlerts);
}, 30000);

// Mock API Service
export const mockApi = {
  getForecastMetrics: async (): Promise<ForecastMetrics[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockMetrics;
  },

  getDemandAlerts: async (): Promise<DemandAlert[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    mockAlerts = buildSystemAlerts(mockForecasts, mockEndpoints, mockAlerts);
    return mockAlerts;
  },

  resolveDemandAlert: async (alertId: string): Promise<DemandAlert> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const alert = mockAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
    return alert || mockAlerts[0];
  },

  getRetrainingJobs: async (): Promise<RetrainingJob[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockJobs;
  },

  startRetrainingJob: async (modelId: string): Promise<RetrainingJob> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newJob: RetrainingJob = {
      id: uuidv4(),
      modelId,
      status: 'pending',
      startTime: new Date().toISOString(),
    };
    mockJobs.unshift(newJob);
    return newJob;
  },

  getRetrainingJobStatus: async (jobId: string): Promise<RetrainingJob> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockJobs.find(j => j.id === jobId) || mockJobs[0];
  },

  getAPIEndpoints: async (): Promise<APIEndpoint[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockEndpoints;
  },

  checkEndpointStatus: async (endpointId: string): Promise<APIEndpoint> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const endpoint = mockEndpoints.find(e => e.id === endpointId);
    if (endpoint) {
      endpoint.responseTime = Math.floor(Math.random() * 300) + 50;
      endpoint.lastCheck = new Date().toISOString();
      endpoint.status = Math.random() > 0.2 ? 'active' : 'inactive';
    }
    mockAlerts = buildSystemAlerts(mockForecasts, mockEndpoints, mockAlerts);
    return endpoint || mockEndpoints[0];
  },

  getModelVersions: async (): Promise<ModelVersion[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockModelVersions;
  },

  getDataQuality: async (): Promise<DataQuality> => {
    await new Promise(resolve => setTimeout(resolve, 250));
    return mockDataQuality;
  },

  getDemandForecasts: async (): Promise<DemandForecast[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockForecasts;
  },

  getFeatureImportance: async (): Promise<FeatureImportance[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockFeatures;
  },

  getForecastInsights: async (): Promise<ForecastInsights> => {
    await new Promise(resolve => setTimeout(resolve, 350));
    return mockForecastInsights;
  },

  getPhilippineHolidays: async (year: number, month?: number): Promise<PhilippineHoliday[]> => {
    await new Promise(resolve => setTimeout(resolve, 250));
    const holidays = getStaticPhilippineHolidays(year);
    if (!month) return holidays;
    return holidays.filter((holiday) => holiday.month === month);
  },

  deployModelVersion: async (versionId: string): Promise<ModelVersion> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const version = mockModelVersions.find(v => v.id === versionId);
    if (version) {
      mockModelVersions.forEach(v => v.status = 'archived');
      version.status = 'active';
    }
    return version || mockModelVersions[0];
  },

  rollbackModelVersion: async (versionId: string): Promise<ModelVersion> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const version = mockModelVersions.find(v => v.id === versionId);
    if (version) {
      mockModelVersions.forEach(v => v.status = 'archived');
      version.status = 'active';
    }
    return version || mockModelVersions[0];
  },
};
