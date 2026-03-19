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
const TOP10_MARKET_HOLIDAYS_CSV_PATH = path.resolve(__dirname, '../db/Top10MH.csv');
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

    if (!Number.isFinite(Number(arrivals))) {
      return res.status(400).json({ error: 'arrivals is required and must be numeric' });
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
        Number(arrivals),
        avgHighTempC ?? null,
        avgLowTempC ?? null,
        precipitationCm ?? null,
        inflationRate ?? null,
        isPeakSeason ?? null,
        isDecember ?? null,
        isLockdown ?? null,
        philippineHolidayCount ?? null,
        top10MarketHolidays ?? null,
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

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error', details: error.message });
});

app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
});
