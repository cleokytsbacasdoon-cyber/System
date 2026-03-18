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
