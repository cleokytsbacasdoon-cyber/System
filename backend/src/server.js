const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

dotenv.config();

const { query } = require('./db');
const { getModelStatus, retrainLocalModel, buildForecastSeries } = require('./ml/tourismModelService');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

const mapForecastMetric = (row) => ({
  id: row.id,
  mape: Number(row.mape),
  rmse: Number(row.rmse),
  mae: Number(row.mae),
  r2Score: Number(row.r2_score),
  timestamp: row.timestamp,
});

const mapDemandAlert = (row) => ({
  id: row.id,
  modelId: row.model_id,
  severity: row.severity,
  message: row.message,
  threshold: Number(row.threshold),
  currentValue: Number(row.current_value),
  timestamp: row.timestamp,
  resolved: row.resolved,
  alertType: row.alert_type,
});

const mapRetrainingJob = (row) => ({
  id: row.id,
  modelId: row.model_id,
  modelName: row.model_id,
  status: row.status,
  startTime: row.start_time,
  endTime: row.end_time,
  accuracy: row.accuracy !== null ? Number(row.accuracy) : undefined,
  errorMessage: row.error_message || undefined,
});

const mapApiEndpoint = (row) => ({
  id: row.id,
  name: row.name,
  url: row.url,
  status: row.status,
  responseTime: Number(row.response_time),
  lastCheck: row.last_check,
});

const mapModelVersion = (row) => ({
  id: row.id,
  version: row.version,
  deployDate: row.deploy_date,
  accuracy: Number(row.accuracy),
  precision: Number(row.precision),
  recall: Number(row.recall),
  status: row.status,
});

const mapMlModel = (row) => ({
  id: row.id,
  name: row.name,
  algorithm: row.algorithm,
  status: row.status,
  createdAt: row.created_at,
});

const mapDataQuality = (row) => ({
  id: row.id,
  completeness: Number(row.completeness),
  schemaValid: row.schema_valid,
  freshness: Number(row.freshness),
  lastUpdate: row.last_update,
  recordsProcessed: Number(row.records_processed),
});

const mapDemandForecast = (row) => ({
  id: row.id,
  actualOccupancy: Number(row.actual_occupancy),
  predictedOccupancy: Number(row.predicted_occupancy),
  error: Number(row.error),
  date: row.date,
  location: row.location,
  accommodationType: row.accommodation_type,
});

const mapFeatureImportance = (row) => ({
  name: row.name,
  importance: Number(row.importance),
  category: row.category,
});

const mapMonthlyTourismDataset = (row) => ({
  id: row.id,
  year: Number(row.year),
  month: Number(row.month),
  arrivals: Number(row.arrivals),
  avgHighTempC: row.avg_high_temp_c !== null ? Number(row.avg_high_temp_c) : null,
  avgLowTempC: row.avg_low_temp_c !== null ? Number(row.avg_low_temp_c) : null,
  precipitationCm: row.precipitation_cm !== null ? Number(row.precipitation_cm) : null,
  inflationRate: row.inflation_rate !== null ? Number(row.inflation_rate) : null,
  isPeakSeason: row.is_peak_season,
  isDecember: row.is_december,
  isLockdown: row.is_lockdown,
  philippineHolidayCount: row.philippine_holiday_count,
  top10MarketHolidays: row.top_10_market_holidays,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const CALENDARIFIC_BASE_URL = 'https://calendarific.com/api/v2/holidays';
const PANGLAO_CHECKINS_SUBMISSION_API_URL = 'https://panglaoitdms.com/api/research/checkins-submission';
const TOP10_MARKET_HOLIDAYS_CSV_PATH = path.resolve(__dirname, '../db/Top10MH.csv');
const HISTORICAL_DATASET_CSV_PATH = path.resolve(__dirname, '../db/2016 - 2025 datasets.csv');
const MODEL_STORAGE_DIR = process.env.ML_MODEL_DIR
  ? path.resolve(__dirname, '..', process.env.ML_MODEL_DIR)
  : path.resolve(__dirname, '../models');

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];
const MONTH_NAME_TO_NUMBER = MONTH_NAMES.reduce((acc, item, index) => {
  acc[item] = index + 1;
  return acc;
}, {});
const HISTORICAL_START_YEAR = 2016;
const HISTORICAL_END_YEAR = 2025;
const PANGALAO_LATITUDE = 9.5728;
const PANGALAO_LONGITUDE = 123.7553;
const PANGALAO_TIMEZONE = 'Asia%2FManila';

const ensureHolidayCacheTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS philippine_holiday_counts (
      year INTEGER NOT NULL CHECK (year BETWEEN 1900 AND 2100),
      month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      holiday_count INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT 'calendarific',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (year, month)
    )
  `);
};

const getCachedPhilippineHolidayCount = async (year, month) => {
  const result = await query(
    `SELECT holiday_count
     FROM philippine_holiday_counts
     WHERE year = $1 AND month = $2
     LIMIT 1`,
    [year, month]
  );

  if (result.rowCount === 0) return null;
  return Number(result.rows[0].holiday_count);
};

const cachePhilippineHolidayCount = async (year, month, count) => {
  await query(
    `INSERT INTO philippine_holiday_counts (year, month, holiday_count, source, updated_at)
     VALUES ($1, $2, $3, 'calendarific', NOW())
     ON CONFLICT (year, month) DO UPDATE SET
       holiday_count = EXCLUDED.holiday_count,
       source = EXCLUDED.source,
       updated_at = NOW()`,
    [year, month, count]
  );

  // Also backfill monthly dataset if the row exists for model feature reuse.
  await query(
    `UPDATE monthly_tourism_dataset
     SET philippine_holiday_count = $3,
         updated_at = NOW()
     WHERE year = $1 AND month = $2`,
    [year, month, count]
  );
};

const sanitizeModelName = (value) =>
  String(value || 'xgboost_base')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'xgboost_base';

const monthNumberToName = (monthNumber) => MONTH_NAMES[Number(monthNumber) - 1] || 'month';

const resolveModelFileByVersion = (version) => path.resolve(MODEL_STORAGE_DIR, `${version}.json`);
const resolveMetadataFileByVersion = (version) => path.resolve(MODEL_STORAGE_DIR, `${version}_metadata.json`);

const toTrainingPayloadRow = (row) => {
  const top10MarketHolidaysValue = Number(row.top_10_market_holidays);

  return {
    Year: Number(row.year),
    Month: monthNumberToName(row.month),
    Arrivals: Number(row.arrivals),
    Peak_Season: row.is_peak_season ? 1 : 0,
    Philippine_Holidays: Number(row.philippine_holiday_count || 0),
    Top10Market_Holidays: Number.isFinite(top10MarketHolidaysValue) ? top10MarketHolidaysValue : 0,
    Avg_HighTemp: Number(row.avg_high_temp_c || 0),
    Avg_LowTemp: Number(row.avg_low_temp_c || 0),
    Precipitation: Number(row.precipitation_cm || 0),
    Inflation_Rate: Number(row.inflation_rate || 0),
    is_December: row.is_december ? 1 : 0,
    is_Lockdown: row.is_lockdown ? 1 : 0,
  };
};

const readTop10MarketHolidaysFromCsv = () => {
  const raw = fs.readFileSync(TOP10_MARKET_HOLIDAYS_CSV_PATH, 'utf8').trim();
  if (!raw) return [];

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const records = [];

  for (let i = 0; i < lines.length - 1; i += 2) {
    const headerValues = lines[i].split(',').map((item) => item.trim());
    const valueValues = lines[i + 1].split(',').map((item) => item.trim());

    const year = Number(headerValues[0]);
    const monthName = String(headerValues[1] || '').toLowerCase();
    const month = MONTH_NAME_TO_NUMBER[monthName];

    if (!Number.isInteger(year) || !Number.isInteger(month)) {
      continue;
    }

    const lastHeaderIndex = headerValues.length - 1;
    const hasTotalColumn = String(headerValues[lastHeaderIndex] || '').toLowerCase() === 'total';
    const countriesEndIndex = hasTotalColumn ? lastHeaderIndex - 1 : lastHeaderIndex;
    const totalHolidays = hasTotalColumn ? Number(valueValues[lastHeaderIndex] || 0) : 0;

    let rank = 1;
    for (let col = 2; col <= countriesEndIndex; col += 1) {
      const country = String(headerValues[col] || '').trim();
      if (!country) continue;

      records.push({
        year,
        month,
        rank,
        country,
        holidayCount: Number(valueValues[col] || 0),
        totalHolidays,
      });

      rank += 1;
    }
  }

  return records;
};

const readHistoricalDatasetFromCsv = () => {
  const raw = fs.readFileSync(HISTORICAL_DATASET_CSV_PATH, 'utf8').trim();
  if (!raw) return [];

  const [headerLine, ...dataLines] = raw.split(/\r?\n/);
  const headers = headerLine.split(',').map((item) => item.trim());

  return dataLines
    .filter(Boolean)
    .map((line) => {
      const values = line.split(',').map((item) => item.trim());
      const row = {};

      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      const monthNumber = MONTH_NAME_TO_NUMBER[String(row.Month || '').toLowerCase()];
      if (!Number.isInteger(monthNumber)) return null;

      return {
        year: Number(row.Year),
        month: monthNumber,
        arrivals: Number(row.Arrivals),
        isPeakSeason: Number(row.Peak_Season) === 1,
        philippineHolidayCount: Number(row.Philippine_Holidays),
        top10MarketHolidays: Number(row.Top10Market_Holidays),
        avgHighTempC: Number(row.Avg_HighTemp),
        avgLowTempC: Number(row.Avg_LowTemp),
        precipitationCm: Number(row.Precipitation),
        inflationRate: Number(row.Inflation_Rate),
        isDecember: Number(row.is_December) === 1,
        isLockdown: Number(row.is_Lockdown) === 1,
      };
    })
    .filter(Boolean);
};

const getHistoricalDatasetRecord = (year, month) => {
  const records = readHistoricalDatasetFromCsv();
  return records.find((record) => record.year === year && record.month === month) || null;
};

const fetchMonthlyWeatherFromOpenMeteo = async (year, month) => {
  const mm = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;
  const startDate = `${year}-${mm}-01`;

  const url =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${PANGALAO_LATITUDE}&longitude=${PANGALAO_LONGITUDE}` +
    `&start_date=${startDate}&end_date=${endDate}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&timezone=${PANGALAO_TIMEZONE}`;

  const response = await axios.get(url, { timeout: 10000 });
  const daily = response.data?.daily || {};
  const maxTemps = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max : [];
  const minTemps = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min : [];
  const precip = Array.isArray(daily.precipitation_sum) ? daily.precipitation_sum : [];

  if (maxTemps.length === 0) return null;

  const avg = (arr) => arr.reduce((sum, value) => sum + Number(value || 0), 0) / Math.max(arr.length, 1);
  const precipTotalCm = precip.reduce((sum, value) => sum + Number(value || 0), 0) / 10;

  return {
    avgHighTempC: Number(avg(maxTemps).toFixed(2)),
    avgLowTempC: Number(avg(minTemps).toFixed(2)),
    precipitationCm: Number(precipTotalCm.toFixed(2)),
  };
};

const fetchPhilippineHolidayCountFromCalendarific = async (year, month) => {
  const apiKey = process.env.CALENDARIFIC_API_KEY;
  if (!apiKey) return null;

  const response = await axios.get(CALENDARIFIC_BASE_URL, {
    params: {
      api_key: apiKey,
      country: 'PH',
      year,
      month,
    },
    timeout: 10000,
  });

  return (response.data?.response?.holidays || []).length;
};

const fetchPanglaoCheckinsSubmission = async (year, month) => {
  const response = await axios.get(PANGLAO_CHECKINS_SUBMISSION_API_URL, {
    params: { year, month },
    timeout: 10000,
  });

  const payload = response.data?.data || {};

  return {
    year: Number(payload.year ?? year),
    month: Number(payload.month ?? month),
    totalCheckIns: Number(payload.total_check_ins ?? 0),
    submissionRatePercentage: Number(payload.submission_rate_percentage ?? 0),
  };
};

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', service: 'ml-monitoring-backend', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', service: 'ml-monitoring-backend', database: 'disconnected', error: error.message });
  }
});

app.get('/api/metrics/forecasts', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM forecast_metrics ORDER BY timestamp DESC LIMIT 100');
    res.json(result.rows.map(mapForecastMetric));
  } catch (error) {
    next(error);
  }
});

app.get('/api/metrics/forecasts/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM forecast_metrics WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Metric not found' });
    res.json(mapForecastMetric(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.get('/api/alerts/demand', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM demand_alerts ORDER BY timestamp DESC');
    res.json(result.rows.map(mapDemandAlert));
  } catch (error) {
    next(error);
  }
});

app.put('/api/alerts/demand/:id/resolve', async (req, res, next) => {
  try {
    const result = await query(
      'UPDATE demand_alerts SET resolved = TRUE WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Alert not found' });
    res.json(mapDemandAlert(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.get('/api/retraining/jobs', async (_req, res, next) => {
  try {
    const result = await query(
      "SELECT * FROM retraining_jobs WHERE model_id ILIKE 'xgboost%' ORDER BY start_time DESC"
    );
    res.json(result.rows.map(mapRetrainingJob));
  } catch (error) {
    next(error);
  }
});

app.post('/api/retraining/jobs', async (req, res, next) => {
  try {
    const modelName = sanitizeModelName(req.body?.modelName || req.body?.modelId || 'xgboost_base');

    const jobId = `job-${Date.now()}`;
    const result = await query(
      'INSERT INTO retraining_jobs (id, model_id, status, start_time) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [jobId, modelName, 'pending']
    );

    res.status(201).json(mapRetrainingJob(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.get('/api/retraining/jobs/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM retraining_jobs WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Retraining job not found' });
    res.json(mapRetrainingJob(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.get('/api/api/endpoints', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM api_endpoints ORDER BY name ASC');
    res.json(result.rows.map(mapApiEndpoint));
  } catch (error) {
    next(error);
  }
});

app.post('/api/api/endpoints/:id/check', async (req, res, next) => {
  try {
    const responseTime = Math.floor(Math.random() * 150) + 40;
    const status = responseTime < 170 ? 'active' : 'inactive';

    const result = await query(
      'UPDATE api_endpoints SET status = $1, response_time = $2, last_check = NOW() WHERE id = $3 RETURNING *',
      [status, responseTime, req.params.id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Endpoint not found' });
    res.json(mapApiEndpoint(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.get('/api/models/versions', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM model_versions ORDER BY deploy_date DESC');
    res.json(result.rows.map(mapModelVersion));
  } catch (error) {
    next(error);
  }
});

app.get('/api/models', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM ml_models ORDER BY created_at ASC');
    res.json(result.rows.map(mapMlModel));
  } catch (error) {
    next(error);
  }
});

app.post('/api/models/versions/:id/deploy', async (req, res, next) => {
  try {
    await query("UPDATE model_versions SET status = 'archived'");
    const result = await query(
      "UPDATE model_versions SET status = 'active', deploy_date = NOW() WHERE id = $1 RETURNING *",
      [req.params.id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Model version not found' });
    res.json(mapModelVersion(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.post('/api/models/versions/:id/rollback', async (req, res, next) => {
  try {
    const result = await query(
      "UPDATE model_versions SET status = 'archived' WHERE id = $1 RETURNING *",
      [req.params.id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Model version not found' });
    res.json(mapModelVersion(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.get('/api/data/quality', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM data_quality ORDER BY last_update DESC LIMIT 1');
    if (result.rowCount === 0) {
      const datasetResult = await query('SELECT COUNT(*)::int AS total_rows FROM monthly_tourism_dataset');
      const totalRows = Number(datasetResult.rows[0]?.total_rows || 0);

      return res.json({
        id: 'dq-computed',
        completeness: totalRows > 0 ? 100 : 0,
        schemaValid: true,
        freshness: totalRows > 0 ? 100 : 0,
        lastUpdate: new Date().toISOString(),
        recordsProcessed: totalRows,
      });
    }
    res.json(mapDataQuality(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.get('/api/ml/model/status', async (_req, res, next) => {
  try {
    const status = getModelStatus();
    res.json(status);
  } catch (error) {
    next(error);
  }
});

app.post('/api/ml/retrain', async (req, res, next) => {
  try {
    const result = await retrainLocalModel({
      modelVersion: req.body?.modelVersion,
      datasetPath: req.body?.datasetPath,
      modelPath: req.body?.modelPath,
      metadataPath: req.body?.metadataPath,
    });

    res.status(201).json({
      message: 'Model retrained successfully.',
      result,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/ml/trained-models', async (_req, res, next) => {
  try {
    const result = await query(
      "SELECT * FROM model_versions WHERE lower(version) LIKE 'xgboost%' ORDER BY deploy_date DESC"
    );

    const models = result.rows.map((row) => ({
      id: row.id,
      modelName: row.version,
      createdAt: row.deploy_date,
      accuracy: row.accuracy !== null ? Number(row.accuracy) : undefined,
      inUse: row.status === 'active',
      algorithm: 'XGBoost',
    }));

    res.json(models);
  } catch (error) {
    next(error);
  }
});

app.post('/api/ml/trained-models/:id/use', async (req, res, next) => {
  try {
    const target = await query('SELECT * FROM model_versions WHERE id = $1', [req.params.id]);
    if (target.rowCount === 0) {
      return res.status(404).json({ error: 'Trained model not found' });
    }

    const version = target.rows[0].version;
    const selectedModelFile = resolveModelFileByVersion(version);
    const selectedMetadataFile = resolveMetadataFileByVersion(version);

    const status = getModelStatus();
    if (!fs.existsSync(selectedModelFile) || !fs.existsSync(selectedMetadataFile)) {
      return res.status(400).json({
        error: 'Model artifact files are missing',
        details: { selectedModelFile, selectedMetadataFile },
      });
    }

    fs.copyFileSync(selectedModelFile, status.localModelFile);
    fs.copyFileSync(selectedMetadataFile, status.localMetadataFile);

    await query("UPDATE model_versions SET status = 'archived' WHERE lower(version) LIKE 'xgboost%'");
    const updated = await query(
      "UPDATE model_versions SET status = 'active', deploy_date = NOW() WHERE id = $1 RETURNING *",
      [req.params.id]
    );

    res.json({
      id: updated.rows[0].id,
      modelName: updated.rows[0].version,
      createdAt: updated.rows[0].deploy_date,
      accuracy: updated.rows[0].accuracy !== null ? Number(updated.rows[0].accuracy) : undefined,
      inUse: true,
      algorithm: 'XGBoost',
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/ml/retrain/simulate-monthly', async (req, res, next) => {
  try {
    const baseModelName = sanitizeModelName(req.body?.baseModelName || 'xgboost_base');
    const year = Number(req.body?.year);
    const month = Number(req.body?.month);

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ error: 'year must be an integer between 2000 and 2100' });
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'month must be an integer between 1 and 12' });
    }

    const trainingRows = await query(
      `SELECT *
       FROM monthly_tourism_dataset
       WHERE year < $1 OR (year = $1 AND month <= $2)
       ORDER BY year, month`,
      [year, month]
    );

    if (trainingRows.rowCount === 0) {
      return res.status(400).json({ error: 'No dataset rows found up to the requested month/year' });
    }

    const monthName = monthNumberToName(month);
    const modelVersion = `${baseModelName}_${monthName}_${year}`;
    const modelPath = resolveModelFileByVersion(modelVersion);
    const metadataPath = resolveMetadataFileByVersion(modelVersion);

    const jobId = `job-${Date.now()}`;
    await query(
      'INSERT INTO retraining_jobs (id, model_id, status, start_time) VALUES ($1, $2, $3, NOW())',
      [jobId, modelVersion, 'running']
    );

    const trainingPayloadRows = trainingRows.rows.map(toTrainingPayloadRow);

    const result = await retrainLocalModel({
      modelVersion,
      modelPath,
      metadataPath,
      rows: trainingPayloadRows,
      baseModelName,
      cutoffYear: year,
      cutoffMonth: month,
    });

    const maeTrain = Number(result?.metrics?.mae_train || 0);
    const rmseTrain = Number(result?.metrics?.rmse_train || 0);
    const mapeTrain = Number(result?.metrics?.mape_train || 0);
    const r2Train = Number(result?.metrics?.r2_train || 0);
    const accuracyValue = Math.max(0, Math.min(1, 1 - (mapeTrain / 100)));

    const versionId = `mv-${Date.now()}`;
    await query(
      `INSERT INTO model_versions (id, version, deploy_date, accuracy, precision, recall, status)
       VALUES ($1, $2, NOW(), $3, $4, $5, 'archived')`,
      [versionId, modelVersion, accuracyValue, accuracyValue, accuracyValue]
    );

    await query(
      `INSERT INTO forecast_metrics (id, mape, rmse, mae, r2_score, timestamp)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [`metric-${Date.now()}`, mapeTrain, rmseTrain, maeTrain, r2Train]
    );

    await query(
      'UPDATE retraining_jobs SET status = $1, end_time = NOW(), accuracy = $2 WHERE id = $3',
      ['completed', accuracyValue, jobId]
    );

    res.status(201).json({
      message: 'Monthly simulation retraining completed',
      model: {
        id: versionId,
        modelName: modelVersion,
        createdAt: new Date().toISOString(),
        accuracy: accuracyValue,
        inUse: false,
        algorithm: 'XGBoost',
      },
      training: {
        baseModelName,
        cutoffYear: year,
        cutoffMonth: month,
        rowCount: trainingRows.rowCount,
      },
      jobId,
      result,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/forecasts', async (req, res, next) => {
  try {
    const preferLegacy = String(req.query.source || '').toLowerCase() === 'legacy';
    const monthsAheadRaw = Number(req.query.monthsAhead ?? 12);
    const monthsAhead = Number.isInteger(monthsAheadRaw) && monthsAheadRaw > 0 ? Math.min(monthsAheadRaw, 24) : 12;

    if (!preferLegacy) {
      try {
        const monthlyResult = await query('SELECT * FROM monthly_tourism_dataset ORDER BY year, month');
        if (monthlyResult.rowCount > 0) {
          const forecastSeries = await buildForecastSeries(monthlyResult.rows, monthsAhead);
          return res.json(forecastSeries);
        }
      } catch (modelError) {
        console.warn('Model-backed forecasts unavailable, using legacy forecasts:', modelError.message);
      }
    }

    const result = await query('SELECT * FROM demand_forecasts ORDER BY date DESC LIMIT 60');
    return res.json(result.rows.map(mapDemandForecast));
  } catch (error) {
    next(error);
  }
});

app.get('/api/models/features/importance', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM feature_importance ORDER BY importance DESC');
    res.json(result.rows.map(mapFeatureImportance));
  } catch (error) {
    next(error);
  }
});

app.get('/api/forecasts/insights', async (_req, res, next) => {
  try {
    const [topFeatures, featureDrift, sampleForecasts] = await Promise.all([
      query('SELECT * FROM feature_importance ORDER BY importance DESC LIMIT 5'),
      query('SELECT * FROM feature_drift'),
      query('SELECT * FROM demand_forecasts ORDER BY date DESC LIMIT 10'),
    ]);

    const driftObject = featureDrift.rows.reduce((acc, row) => {
      acc[row.name] = Number(row.drift);
      return acc;
    }, {});

    res.json({
      topFeatures: topFeatures.rows.map(mapFeatureImportance),
      featureDrift: driftObject,
      sampleForecasts: sampleForecasts.rows.map(mapDemandForecast),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/research/checkins-submission', async (req, res, next) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ error: 'year query parameter is required and must be between 2000 and 2100' });
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'month query parameter is required and must be between 1 and 12' });
    }

    const data = await fetchPanglaoCheckinsSubmission(year, month);
    return res.json(data);
  } catch (error) {
    next(error);
  }
});

app.get('/api/datasets/tourism/monthly', async (req, res, next) => {
  try {
    const year = req.query.year !== undefined ? Number(req.query.year) : undefined;
    const month = req.query.month !== undefined ? Number(req.query.month) : undefined;

    if (year !== undefined && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
      return res.status(400).json({ error: 'year must be an integer between 2000 and 2100' });
    }

    if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) {
      return res.status(400).json({ error: 'month must be an integer between 1 and 12' });
    }

    let result;
    if (year !== undefined && month !== undefined) {
      result = await query(
        'SELECT * FROM monthly_tourism_dataset WHERE year = $1 AND month = $2 ORDER BY year, month',
        [year, month]
      );
    } else if (year !== undefined) {
      result = await query('SELECT * FROM monthly_tourism_dataset WHERE year = $1 ORDER BY year, month', [year]);
    } else {
      result = await query('SELECT * FROM monthly_tourism_dataset ORDER BY year, month');
    }

    res.json(result.rows.map(mapMonthlyTourismDataset));
  } catch (error) {
    next(error);
  }
});

app.post('/api/datasets/tourism/monthly', async (req, res, next) => {
  try {
    const {
      year,
      month,
      arrivals,
      avgHighTempC,
      avgLowTempC,
      precipitationCm,
      inflationRate,
      isPeakSeason,
      isDecember,
      isLockdown,
      philippineHolidayCount,
      top10MarketHolidays,
    } = req.body;

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ error: 'year is required and must be between 2000 and 2100' });
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'month is required and must be between 1 and 12' });
    }

    const existingMonthResult = await query(
      `SELECT philippine_holiday_count
       FROM monthly_tourism_dataset
       WHERE year = $1 AND month = $2
       LIMIT 1`,
      [year, month]
    );
    const existingMonthRow = existingMonthResult.rowCount > 0 ? existingMonthResult.rows[0] : null;
    const isNewMonthRow = existingMonthResult.rowCount === 0;

    const isHistoricalYear = year >= HISTORICAL_START_YEAR && year <= HISTORICAL_END_YEAR;

    let resolvedRow = null;

    if (isHistoricalYear) {
      const historicalRow = getHistoricalDatasetRecord(year, month);
      if (!historicalRow) {
        return res.status(400).json({
          error: `Historical dataset row not found for ${year}-${month}`,
          details: 'For 2016-2025, only the provided historical dataset is allowed.',
        });
      }

      resolvedRow = {
        arrivals: historicalRow.arrivals,
        avgHighTempC: historicalRow.avgHighTempC,
        avgLowTempC: historicalRow.avgLowTempC,
        precipitationCm: historicalRow.precipitationCm,
        inflationRate: historicalRow.inflationRate,
        isPeakSeason: historicalRow.isPeakSeason,
        isDecember: historicalRow.isDecember,
        isLockdown: historicalRow.isLockdown,
        philippineHolidayCount: historicalRow.philippineHolidayCount,
        top10MarketHolidays: historicalRow.top10MarketHolidays,
      };
    } else {
      if (!Number.isFinite(Number(arrivals))) {
        return res.status(400).json({ error: 'arrivals is required and must be numeric' });
      }

      let resolvedPhilippineHolidayCount =
        philippineHolidayCount ??
        (existingMonthRow?.philippine_holiday_count !== null && existingMonthRow?.philippine_holiday_count !== undefined
          ? Number(existingMonthRow.philippine_holiday_count)
          : null);

      // Call Calendarific only once when a brand-new month is detected and count is still missing.
      if (resolvedPhilippineHolidayCount === null && isNewMonthRow) {
        const cachedCount = await getCachedPhilippineHolidayCount(year, month);
        if (cachedCount !== null) {
          resolvedPhilippineHolidayCount = cachedCount;
        } else {
          const fetchedCount = await fetchPhilippineHolidayCountFromCalendarific(year, month).catch(() => null);
          if (Number.isInteger(fetchedCount)) {
            resolvedPhilippineHolidayCount = Number(fetchedCount);
            await cachePhilippineHolidayCount(year, month, resolvedPhilippineHolidayCount);
          }
        }
      }

      const weatherFromApi = (avgHighTempC == null || avgLowTempC == null || precipitationCm == null)
        ? await fetchMonthlyWeatherFromOpenMeteo(year, month).catch(() => null)
        : null;

      resolvedRow = {
        arrivals: Number(arrivals),
        avgHighTempC: avgHighTempC ?? weatherFromApi?.avgHighTempC ?? null,
        avgLowTempC: avgLowTempC ?? weatherFromApi?.avgLowTempC ?? null,
        precipitationCm: precipitationCm ?? weatherFromApi?.precipitationCm ?? null,
        inflationRate: inflationRate ?? null,
        // Future rule: peak season is only August and December.
        isPeakSeason: month === 8 || month === 12,
        // Future rule: December flag is only true for December.
        isDecember: month === 12,
        // Future rule: lockdown is manually controlled by user input (default false).
        isLockdown: isLockdown ?? false,
        philippineHolidayCount: resolvedPhilippineHolidayCount,
        top10MarketHolidays: top10MarketHolidays ?? null,
      };
    }

    const result = await query(
      `INSERT INTO monthly_tourism_dataset (
        year, month, arrivals, avg_high_temp_c, avg_low_temp_c, precipitation_cm,
        inflation_rate, is_peak_season, is_december, is_lockdown,
        philippine_holiday_count, top_10_market_holidays, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, NOW()
      )
      ON CONFLICT (year, month) DO UPDATE SET
        arrivals = EXCLUDED.arrivals,
        avg_high_temp_c = EXCLUDED.avg_high_temp_c,
        avg_low_temp_c = EXCLUDED.avg_low_temp_c,
        precipitation_cm = EXCLUDED.precipitation_cm,
        inflation_rate = EXCLUDED.inflation_rate,
        is_peak_season = EXCLUDED.is_peak_season,
        is_december = EXCLUDED.is_december,
        is_lockdown = EXCLUDED.is_lockdown,
        philippine_holiday_count = EXCLUDED.philippine_holiday_count,
        top_10_market_holidays = EXCLUDED.top_10_market_holidays,
        updated_at = NOW()
      RETURNING *`,
      [
        year,
        month,
        Number(resolvedRow.arrivals),
        resolvedRow.avgHighTempC,
        resolvedRow.avgLowTempC,
        resolvedRow.precipitationCm,
        resolvedRow.inflationRate,
        resolvedRow.isPeakSeason,
        resolvedRow.isDecember,
        resolvedRow.isLockdown,
        resolvedRow.philippineHolidayCount,
        resolvedRow.top10MarketHolidays,
      ]
    );

    res.status(201).json(mapMonthlyTourismDataset(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.get('/api/datasets/tourism/top10-market-holidays', (req, res, next) => {
  try {
    const year = req.query.year !== undefined ? Number(req.query.year) : undefined;
    const month = req.query.month !== undefined ? Number(req.query.month) : undefined;

    if (year !== undefined && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
      return res.status(400).json({ error: 'year must be an integer between 2000 and 2100' });
    }

    if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) {
      return res.status(400).json({ error: 'month must be an integer between 1 and 12' });
    }

    const records = readTop10MarketHolidaysFromCsv().filter((row) => {
      if (year !== undefined && row.year !== year) return false;
      if (month !== undefined && row.month !== month) return false;
      return true;
    });

    return res.json(records);
  } catch (error) {
    next(error);
  }
});

app.get('/api/holidays/philippines', async (req, res, next) => {
  try {
    const year = Number(req.query.year);
    const month = req.query.month !== undefined ? Number(req.query.month) : undefined;

    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      return res.status(400).json({ error: 'year query parameter is required and must be between 1900 and 2100' });
    }

    if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) {
      return res.status(400).json({ error: 'month must be between 1 and 12 when provided' });
    }

    // Prefer local dataset value for covered month entries to minimize external API calls.
    if (month !== undefined) {
      const localResult = await query(
        `SELECT philippine_holiday_count
         FROM monthly_tourism_dataset
         WHERE year = $1 AND month = $2
         LIMIT 1`,
        [year, month]
      );

      if (localResult.rowCount > 0 && localResult.rows[0].philippine_holiday_count !== null) {
        const count = Number(localResult.rows[0].philippine_holiday_count);
        return res.json({
          country: 'PH',
          year,
          month,
          source: 'monthly_tourism_dataset',
          count,
          holidays: [],
        });
      }

      // Then try dedicated holiday cache table.
      const cachedCount = await getCachedPhilippineHolidayCount(year, month);
      if (cachedCount !== null) {
        return res.json({
          country: 'PH',
          year,
          month,
          source: 'philippine_holiday_counts',
          count: cachedCount,
          holidays: [],
        });
      }
    }

    const apiKey = process.env.CALENDARIFIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'Calendarific API key is not configured',
        details: 'Set CALENDARIFIC_API_KEY in backend .env to enable holiday lookups.',
      });
    }

    const params = {
      api_key: apiKey,
      country: 'PH',
      year,
    };

    if (month !== undefined) {
      params.month = month;
    }

    const response = await axios.get(CALENDARIFIC_BASE_URL, {
      params,
      timeout: 10000,
    });

    const holidays = (response.data?.response?.holidays || []).map((holiday) => ({
      name: holiday.name,
      description: holiday.description || '',
      date: holiday.date?.iso,
      month: holiday.date?.datetime?.month,
      day: holiday.date?.datetime?.day,
      type: Array.isArray(holiday.type) ? holiday.type : [],
      primaryType: Array.isArray(holiday.type) && holiday.type.length > 0 ? holiday.type[0] : 'unknown',
    }));

    if (month !== undefined) {
      await cachePhilippineHolidayCount(year, month, holidays.length);
    } else {
      const monthCounts = new Map();
      for (const holiday of holidays) {
        const holidayMonth = Number(holiday.month);
        if (!Number.isInteger(holidayMonth) || holidayMonth < 1 || holidayMonth > 12) continue;
        monthCounts.set(holidayMonth, (monthCounts.get(holidayMonth) || 0) + 1);
      }

      for (let m = 1; m <= 12; m += 1) {
        const count = Number(monthCounts.get(m) || 0);
        await cachePhilippineHolidayCount(year, m, count);
      }
    }

    res.json({
      country: 'PH',
      year,
      month: month ?? null,
      source: 'calendarific',
      count: holidays.length,
      holidays,
    });
  } catch (error) {
    if (error.response?.status) {
      return res.status(error.response.status).json({
        error: 'Calendarific request failed',
        details: error.response.data,
      });
    }

    next(error);
  }
});

app.post('/api/holidays/philippines/cache-range', async (req, res, next) => {
  try {
    const startYear = Number(req.body?.startYear ?? 2016);
    const endYear = Number(req.body?.endYear ?? new Date().getFullYear());

    if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || startYear < 1900 || endYear > 2100 || startYear > endYear) {
      return res.status(400).json({
        error: 'startYear/endYear must be integers between 1900 and 2100, and startYear must be <= endYear',
      });
    }

    const apiKey = process.env.CALENDARIFIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'Calendarific API key is not configured',
        details: 'Set CALENDARIFIC_API_KEY in backend .env to enable holiday caching.',
      });
    }

    const cached = [];
    for (let year = startYear; year <= endYear; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        const existing = await getCachedPhilippineHolidayCount(year, month);
        if (existing !== null) {
          cached.push({ year, month, count: existing, source: 'cache' });
          continue;
        }

        const response = await axios.get(CALENDARIFIC_BASE_URL, {
          params: {
            api_key: apiKey,
            country: 'PH',
            year,
            month,
          },
          timeout: 10000,
        });

        const holidays = Array.isArray(response.data?.response?.holidays)
          ? response.data.response.holidays
          : [];
        const count = holidays.length;
        await cachePhilippineHolidayCount(year, month, count);
        cached.push({ year, month, count, source: 'calendarific' });
      }
    }

    return res.json({
      message: 'Holiday counts cached successfully',
      startYear,
      endYear,
      monthsProcessed: cached.length,
      results: cached,
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error', details: error.message });
});

ensureHolidayCacheTable().catch((error) => {
  console.error('Failed to ensure philippine_holiday_counts table exists:', error.message);
});

app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
});
