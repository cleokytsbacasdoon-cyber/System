import { describe, it, expect } from 'vitest';
import { ForecastMetrics, DemandAlert, RetrainingJob } from './types';

describe('Types - MetricsCard', () => {
  it('should create valid ForecastMetrics', () => {
    const metric: ForecastMetrics = {
      id: '1',
      mape: 8.5,
      rmse: 15.2,
      mae: 12.3,
      r2Score: 0.92,
      timestamp: '2026-02-25T10:30:00Z',
    };

    expect(metric.mape).toBeGreaterThanOrEqual(0);
    expect(metric.r2Score).toBeLessThanOrEqual(1);
  });
});

describe('Types - DemandAlert', () => {
  it('should create valid DemandAlert', () => {
    const alert: DemandAlert = {
      id: '1',
      modelId: 'model-1',
      severity: 'high',
      message: 'Demand surge detected',
      threshold: 0.15,
      currentValue: 0.45,
      resolved: false,
      timestamp: '2026-02-25T10:30:00Z',
      alertType: 'anomaly',
    };

    expect(['low', 'medium', 'high']).toContain(alert.severity);
    expect(alert.threshold).toBeLessThan(alert.currentValue);
  });
});

describe('Types - RetrainingJob', () => {
  it('should create valid RetrainingJob', () => {
    const job: RetrainingJob = {
      id: '1',
      modelId: 'model-1',
      status: 'running',
      startTime: '2026-02-25T10:30:00Z',
    };

    expect(['pending', 'running', 'completed', 'failed']).toContain(job.status);
  });

  it('should have optional fields for completed job', () => {
    const job: RetrainingJob = {
      id: '1',
      modelId: 'model-1',
      status: 'completed',
      startTime: '2026-02-25T10:30:00Z',
      endTime: '2026-02-25T11:30:00Z',
      accuracy: 0.96,
    };

    expect(job.accuracy).toBeDefined();
    expect(job.endTime).toBeDefined();
  });
});
