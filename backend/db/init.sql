CREATE TABLE IF NOT EXISTS forecast_metrics (
  id TEXT PRIMARY KEY,
  mape NUMERIC NOT NULL,
  rmse NUMERIC NOT NULL,
  mae NUMERIC NOT NULL,
  r2_score NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ml_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS demand_alerts (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  threshold NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  alert_type TEXT
);

CREATE TABLE IF NOT EXISTS retraining_jobs (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL,
  status TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  accuracy NUMERIC,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS api_endpoints (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL,
  response_time INTEGER NOT NULL,
  last_check TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS model_versions (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  deploy_date TIMESTAMPTZ NOT NULL,
  accuracy NUMERIC NOT NULL,
  precision NUMERIC NOT NULL,
  recall NUMERIC NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS data_quality (
  id TEXT PRIMARY KEY,
  completeness NUMERIC NOT NULL,
  schema_valid BOOLEAN NOT NULL,
  freshness NUMERIC NOT NULL,
  last_update TIMESTAMPTZ NOT NULL,
  records_processed INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS demand_forecasts (
  id TEXT PRIMARY KEY,
  actual_occupancy NUMERIC NOT NULL,
  predicted_occupancy NUMERIC NOT NULL,
  error NUMERIC NOT NULL,
  date DATE NOT NULL,
  location TEXT,
  accommodation_type TEXT
);

CREATE TABLE IF NOT EXISTS feature_importance (
  name TEXT PRIMARY KEY,
  importance NUMERIC NOT NULL,
  category TEXT
);

CREATE TABLE IF NOT EXISTS feature_drift (
  name TEXT PRIMARY KEY,
  drift NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS monthly_tourism_dataset (
  id BIGSERIAL PRIMARY KEY,
  year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  arrivals INTEGER NOT NULL,
  avg_high_temp_c NUMERIC(5,2),
  avg_low_temp_c NUMERIC(5,2),
  precipitation_cm NUMERIC(6,2),
  inflation_rate NUMERIC(5,2),
  is_peak_season BOOLEAN,
  is_december BOOLEAN,
  is_lockdown BOOLEAN,
  philippine_holiday_count INTEGER,
  top_10_market_holidays TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (year, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_tourism_dataset_year_month
  ON monthly_tourism_dataset (year, month);

INSERT INTO ml_models (id, name, algorithm, status, created_at) VALUES
('model-1', 'Tourism Demand Predictor - RF', 'Random Forest', 'active', NOW() - INTERVAL '90 day'),
('model-2', 'Tourism Demand Predictor - XGB', 'XGBoost', 'active', NOW() - INTERVAL '60 day'),
('model-3', 'Tourism Demand Predictor - LSTM', 'LSTM', 'active', NOW() - INTERVAL '40 day'),
('model-4', 'Tourism Demand Predictor - Prophet', 'Prophet', 'active', NOW() - INTERVAL '25 day')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    algorithm = EXCLUDED.algorithm,
    status = EXCLUDED.status;

INSERT INTO forecast_metrics (id, mape, rmse, mae, r2_score, timestamp) VALUES
('metric-1', 8.1, 12.4, 9.8, 0.89, NOW() - INTERVAL '2 day'),
('metric-2', 7.6, 11.9, 9.2, 0.91, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO demand_alerts (id, model_id, severity, message, threshold, current_value, timestamp, resolved, alert_type) VALUES
('alert-1', 'model-1', 'high', 'Occupancy trend drift detected', 0.20, 0.34, NOW() - INTERVAL '4 hour', FALSE, 'drift'),
('alert-2', 'model-2', 'medium', 'Seasonality shift above threshold', 0.15, 0.21, NOW() - INTERVAL '8 hour', FALSE, 'seasonality'),
('alert-3', 'model-3', 'low', 'Feature stability warning on weather signals', 0.12, 0.14, NOW() - INTERVAL '3 hour', FALSE, 'trend'),
('alert-4', 'model-4', 'medium', 'Recent anomaly rate increased for holiday periods', 0.10, 0.18, NOW() - INTERVAL '2 hour', FALSE, 'anomaly')
ON CONFLICT (id) DO NOTHING;

INSERT INTO retraining_jobs (id, model_id, status, start_time, end_time, accuracy, error_message) VALUES
('job-1', 'model-1', 'completed', NOW() - INTERVAL '3 day', NOW() - INTERVAL '3 day' + INTERVAL '45 minute', 0.93, NULL),
('job-2', 'model-2', 'running', NOW() - INTERVAL '20 minute', NULL, NULL, NULL),
('job-3', 'model-3', 'pending', NOW() - INTERVAL '10 minute', NULL, NULL, NULL),
('job-4', 'model-4', 'completed', NOW() - INTERVAL '5 day', NOW() - INTERVAL '5 day' + INTERVAL '52 minute', 0.91, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO api_endpoints (id, name, url, status, response_time, last_check) VALUES
('ep-1', 'Forecast Predict', '/v1/forecast/predict', 'active', 118, NOW() - INTERVAL '2 minute'),
('ep-2', 'Model Health', '/v1/model/health', 'active', 72, NOW() - INTERVAL '1 minute'),
('ep-3', 'Retraining Trigger', '/v1/retraining/start', 'inactive', 0, NOW() - INTERVAL '30 minute')
ON CONFLICT (id) DO NOTHING;

INSERT INTO model_versions (id, version, deploy_date, accuracy, precision, recall, status) VALUES
('mv-1', 'model-1-v1.0.0', NOW() - INTERVAL '30 day', 0.89, 0.87, 0.85, 'archived'),
('mv-2', 'model-2-v1.1.0', NOW() - INTERVAL '21 day', 0.91, 0.89, 0.88, 'archived'),
('mv-3', 'model-3-v1.0.2', NOW() - INTERVAL '14 day', 0.92, 0.90, 0.90, 'archived'),
('mv-4', 'model-4-v1.2.0', NOW() - INTERVAL '7 day', 0.93, 0.91, 0.90, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO monthly_tourism_dataset (
  year,
  month,
  arrivals,
  avg_high_temp_c,
  avg_low_temp_c,
  precipitation_cm,
  inflation_rate,
  is_peak_season,
  is_december,
  is_lockdown,
  philippine_holiday_count,
  top_10_market_holidays
) VALUES
(2025, 11, 44210, 31.2, 24.1, 13.4, 3.8, TRUE, FALSE, FALSE, 2, 'US Thanksgiving, Japan Culture Day'),
(2025, 12, 48690, 30.7, 23.9, 10.2, 3.7, TRUE, TRUE, FALSE, 5, 'Christmas, New Year')
ON CONFLICT (year, month) DO NOTHING;

INSERT INTO data_quality (id, completeness, schema_valid, freshness, last_update, records_processed) VALUES
('dq-1', 98.4, TRUE, 96.2, NOW() - INTERVAL '10 minute', 125340)
ON CONFLICT (id) DO NOTHING;

INSERT INTO demand_forecasts (id, actual_occupancy, predicted_occupancy, error, date, location, accommodation_type) VALUES
('fc-1', 73, 70, 3, CURRENT_DATE - 2, 'City Center', 'Hotel'),
('fc-2', 81, 84, 3, CURRENT_DATE - 1, 'Beach District', 'Resort'),
('fc-3', 77, 79, 2, CURRENT_DATE, 'Business Hub', 'Apartment')
ON CONFLICT (id) DO NOTHING;

INSERT INTO feature_importance (name, importance, category) VALUES
('seasonality', 0.34, 'temporal'),
('events', 0.22, 'external'),
('price', 0.18, 'economic'),
('weather', 0.14, 'external'),
('historical_demand', 0.12, 'historical')
ON CONFLICT (name) DO NOTHING;

INSERT INTO feature_drift (name, drift) VALUES
('seasonality', 0.09),
('events', 0.17),
('price', 0.05),
('weather', 0.03),
('historical_demand', 0.07)
ON CONFLICT (name) DO NOTHING;
