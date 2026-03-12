import { describe, it, expect } from 'vitest';

describe('Utils - Formatting', () => {
  it('should format percentage correctly', () => {
    const format = (value: number) => (value * 100).toFixed(2);
    expect(format(0.95)).toBe('95.00');
    expect(format(0.854)).toBe('85.40');
  });

  it('should calculate average correctly', () => {
    const values = [0.8, 0.9, 0.85];
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    expect(avg).toBe(0.85);
  });

  it('should format date correctly', () => {
    const date = new Date('2026-02-25T10:30:00Z');
    const formatted = date.toLocaleString();
    expect(formatted).toBeTruthy();
  });
});

describe('Utils - Data Validation', () => {
  it('should validate metric values', () => {
    const isValidMetric = (value: number) => value >= 0 && value <= 1;
    expect(isValidMetric(0.9)).toBe(true);
    expect(isValidMetric(1.5)).toBe(false);
    expect(isValidMetric(-0.5)).toBe(false);
  });

  it('should validate alert severity', () => {
    const isValidSeverity = (severity: string) => 
      ['low', 'medium', 'high'].includes(severity);
    
    expect(isValidSeverity('high')).toBe(true);
    expect(isValidSeverity('critical')).toBe(false);
  });

  it('should validate job status', () => {
    const isValidStatus = (status: string) => 
      ['pending', 'running', 'completed', 'failed'].includes(status);
    
    expect(isValidStatus('running')).toBe(true);
    expect(isValidStatus('unknown')).toBe(false);
  });
});

describe('Utils - Data Aggregation', () => {
  it('should count alerts by severity', () => {
    const alerts = [
      { id: '1', severity: 'high' },
      { id: '2', severity: 'high' },
      { id: '3', severity: 'medium' },
      { id: '4', severity: 'low' },
    ];

    const highCount = alerts.filter(a => a.severity === 'high').length;
    const mediumCount = alerts.filter(a => a.severity === 'medium').length;
    
    expect(highCount).toBe(2);
    expect(mediumCount).toBe(1);
  });

  it('should calculate total from metrics', () => {
    const metrics = [
      { accuracy: 0.9 },
      { accuracy: 0.85 },
      { accuracy: 0.92 },
    ];

    const total = metrics.reduce((sum, m) => sum + m.accuracy, 0);
    expect(total).toBe(2.67);
  });

  it('should filter resolved alerts', () => {
    const alerts = [
      { id: '1', resolved: true },
      { id: '2', resolved: false },
      { id: '3', resolved: true },
    ];

    const unresolved = alerts.filter(a => !a.resolved);
    expect(unresolved.length).toBe(1);
  });
});
