CREATE TABLE IF NOT EXISTS forecast_metrics (
  id TEXT PRIMARY KEY,
  mape NUMERIC NOT NULL,
  rmse NUMERIC NOT NULL,
  mae NUMERIC NOT NULL,
  r2_score NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

INSERT INTO forecast_metrics (id, mape, rmse, mae, r2_score, timestamp) VALUES
('metric-1', 8.1, 12.4, 9.8, 0.89, NOW() - INTERVAL '2 day'),
('metric-2', 7.6, 11.9, 9.2, 0.91, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO demand_alerts (id, model_id, severity, message, threshold, current_value, timestamp, resolved, alert_type) VALUES
('alert-1', 'model-forecast-v1', 'high', 'Occupancy trend drift detected', 0.20, 0.34, NOW() - INTERVAL '4 hour', FALSE, 'drift'),
('alert-2', 'model-forecast-v1', 'medium', 'Seasonality shift above threshold', 0.15, 0.21, NOW() - INTERVAL '8 hour', FALSE, 'seasonality')
ON CONFLICT (id) DO NOTHING;

INSERT INTO retraining_jobs (id, model_id, status, start_time, end_time, accuracy, error_message) VALUES
('job-1', 'model-forecast-v1', 'completed', NOW() - INTERVAL '3 day', NOW() - INTERVAL '3 day' + INTERVAL '45 minute', 0.93, NULL),
('job-2', 'model-forecast-v2', 'running', NOW() - INTERVAL '20 minute', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO api_endpoints (id, name, url, status, response_time, last_check) VALUES
('ep-1', 'Forecast Predict', '/v1/forecast/predict', 'active', 118, NOW() - INTERVAL '2 minute'),
('ep-2', 'Model Health', '/v1/model/health', 'active', 72, NOW() - INTERVAL '1 minute'),
('ep-3', 'Retraining Trigger', '/v1/retraining/start', 'inactive', 0, NOW() - INTERVAL '30 minute')
ON CONFLICT (id) DO NOTHING;

INSERT INTO model_versions (id, version, deploy_date, accuracy, precision, recall, status) VALUES
('mv-1', 'v1.0.0', NOW() - INTERVAL '30 day', 0.89, 0.87, 0.85, 'archived'),
('mv-2', 'v1.1.0', NOW() - INTERVAL '7 day', 0.93, 0.91, 0.90, 'active')
ON CONFLICT (id) DO NOTHING;

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
