const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

const MODEL_FEATURES = [
  'year',
  'month',
  'peak_season',
  'philippine_holidays',
  'top10market_holidays',
  'avg_hightemp',
  'avg_lowtemp',
  'precipitation',
  'lag_1',
  'lag_2',
  'rolling_mean_3m',
  'growth_rate',
  'sudden_increase',
  'inflation_rate',
  'is_december',
  'is_lockdown',
];

const MODEL_DIR = process.env.ML_MODEL_DIR || path.resolve(__dirname, '../../models');
const MODEL_FILE = process.env.ML_MODEL_FILE || path.join(MODEL_DIR, 'tourism_xgb_model.json');
const MODEL_METADATA_FILE = process.env.ML_MODEL_METADATA_FILE || path.join(MODEL_DIR, 'tourism_model_metadata.json');
const MODEL_SOURCE = (process.env.ML_MODEL_SOURCE || 'local').toLowerCase();
const COLAB_PREDICT_URL = process.env.ML_COLAB_PREDICT_URL || '';
const PYTHON_BIN = process.env.PYTHON_BIN || 'python';
const PYTHON_PREDICT_SCRIPT = path.resolve(__dirname, '../scripts/ml/predict_tourism.py');
const PYTHON_TRAIN_SCRIPT = path.resolve(__dirname, '../scripts/ml/train_tourism.py');

// Model routing — set ML_MODEL env var to switch: xgboost | lstm | random_forest | prophet
const ML_MODEL = (process.env.ML_MODEL || 'xgboost').toLowerCase();
const DB_DIR = path.resolve(__dirname, '../../db');
const DATASET_PATH = process.env.DATASET_PATH || path.join(DB_DIR, '2016 - 2025 datasets.csv');

// LSTM paths
const LSTM_SCALER_PATH = process.env.LSTM_SCALER_PATH || path.join(DB_DIR, 'lstm_model_extracted', 'scaler.pkl');
const LSTM_MODEL_PATH = process.env.LSTM_MODEL_PATH || path.join(DB_DIR, 'lstm_model_extracted', 'lstm_best_model.keras');
const LSTM_DATASET_PATH = DATASET_PATH;
const PYTHON_LSTM_PREDICT_SCRIPT = path.resolve(__dirname, '../scripts/ml/predict_lstm.py');

// Zip-based model paths
const XGBOOST_ZIP_PATH = path.join(DB_DIR, 'xgboost_model.zip');
const RF_ZIP_PATH = path.join(DB_DIR, 'random_forest_optimized.zip');
const PROPHET_ZIP_PATH = path.join(DB_DIR, 'prophet_model.zip');
const PYTHON_XGBOOST_ZIP_SCRIPT = path.resolve(__dirname, '../scripts/ml/predict_xgboost_zip.py');
const PYTHON_RF_SCRIPT = path.resolve(__dirname, '../scripts/ml/predict_random_forest.py');
const PYTHON_PROPHET_SCRIPT = path.resolve(__dirname, '../scripts/ml/predict_prophet.py');

// Training scripts for each model
const PYTHON_TRAIN_LSTM_SCRIPT = path.resolve(__dirname, '../scripts/ml/train_lstm.py');
const PYTHON_TRAIN_RF_SCRIPT = path.resolve(__dirname, '../scripts/ml/train_random_forest.py');
const PYTHON_TRAIN_PROPHET_SCRIPT = path.resolve(__dirname, '../scripts/ml/train_prophet.py');

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (_error) {
    return false;
  }
}

function getModelStatus() {
  const localModelReady = fileExists(MODEL_FILE) && fileExists(MODEL_METADATA_FILE);
  return {
    source: MODEL_SOURCE,
    localModelReady,
    localModelFile: MODEL_FILE,
    localMetadataFile: MODEL_METADATA_FILE,
    colabPredictConfigured: Boolean(COLAB_PREDICT_URL),
  };
}

function runPythonScript(scriptPath, payload) {
  return new Promise((resolve, reject) => {
    const processRef = spawn(PYTHON_BIN, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
      },
    });

    let stdout = '';
    let stderr = '';

    processRef.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    processRef.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    processRef.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr.trim() || `Python script failed with exit code ${code}`));
      }

      try {
        const data = JSON.parse(stdout);
        resolve(data);
      } catch (error) {
        reject(new Error(`Failed to parse Python output: ${error.message}`));
      }
    });

    processRef.on('error', (error) => {
      reject(new Error(`Failed to start Python: ${error.message}`));
    });

    processRef.stdin.write(JSON.stringify(payload));
    processRef.stdin.end();
  });
}

async function predictWithColab(instances) {
  if (!COLAB_PREDICT_URL) {
    throw new Error('ML_COLAB_PREDICT_URL is not configured.');
  }

  const response = await axios.post(COLAB_PREDICT_URL, {
    featureOrder: MODEL_FEATURES,
    rows: instances,
  });

  const predictions = response.data?.predictions;
  if (!Array.isArray(predictions)) {
    throw new Error('Invalid response from Colab endpoint. Expected { predictions: number[] }.');
  }

  return predictions.map((value) => Number(value));
}

async function predictWithLocalModel(instances) {
  if (!fileExists(MODEL_FILE)) {
    throw new Error(`Local model file not found: ${MODEL_FILE}`);
  }

  const output = await runPythonScript(PYTHON_PREDICT_SCRIPT, {
    modelPath: MODEL_FILE,
    rows: instances,
    featureOrder: MODEL_FEATURES,
  });

  if (!Array.isArray(output.predictions)) {
    throw new Error('Invalid local prediction output.');
  }

  return output.predictions.map((value) => Number(value));
}

function monthNameToNumber(monthName) {
  const normalized = String(monthName).toLowerCase();
  const monthMap = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  };
  return monthMap[normalized] || null;
}

function groupAverage(rows, month, field) {
  const candidates = rows.filter((row) => Number(row.month) === Number(month) && row[field] !== null && row[field] !== undefined);
  if (candidates.length === 0) return null;
  const sum = candidates.reduce((acc, row) => acc + Number(row[field]), 0);
  return sum / candidates.length;
}

function toFeatureRow(record) {
  return {
    year: Number(record.year),
    month: Number(record.month),
    peak_season: record.is_peak_season ? 1 : 0,
    philippine_holidays: Number(record.philippine_holiday_count || 0),
    top10market_holidays: Number(record.top_10_market_holidays || 0),
    avg_hightemp: Number(record.avg_high_temp_c || 0),
    avg_lowtemp: Number(record.avg_low_temp_c || 0),
    precipitation: Number(record.precipitation_cm || 0),
    inflation_rate: Number(record.inflation_rate || 0),
    is_december: record.is_december ? 1 : 0,
    is_lockdown: record.is_lockdown ? 1 : 0,
  };
}

// lastArrivals: array of last 3 known actual arrival values [oldest, ..., newest],
// used to populate lag features in future rows (matches notebook V3 approach).
function buildFutureRows(monthlyRows, monthsAhead = 12, lastArrivals = []) {
  if (!monthlyRows.length) return [];

  const sorted = [...monthlyRows].sort((a, b) => (a.year - b.year) || (a.month - b.month));
  const last = sorted[sorted.length - 1];
  const futureRows = [];

  // Notebook approach: use the same last-known lag values for all future months
  const lagArr = lastArrivals.length >= 3 ? lastArrivals : [
    sorted.length >= 3 ? Number(sorted[sorted.length - 3].arrivals || 0) : 0,
    sorted.length >= 2 ? Number(sorted[sorted.length - 2].arrivals || 0) : 0,
    sorted.length >= 1 ? Number(sorted[sorted.length - 1].arrivals || 0) : 0,
  ];
  const lag1 = lagArr[2];
  const lag2 = lagArr[1];
  const rollingMean3m = lagArr.reduce((s, v) => s + v, 0) / 3;
  const growthRate = lag2 > 0 ? Number((((lag1 - lag2) / lag2) * 100).toFixed(4)) : 0;

  for (let i = 1; i <= monthsAhead; i += 1) {
    const absoluteMonth = Number(last.month) + i;
    const year = Number(last.year) + Math.floor((absoluteMonth - 1) / 12);
    const month = ((absoluteMonth - 1) % 12) + 1;

    const avgHighTemp = groupAverage(sorted, month, 'avg_high_temp_c');
    const avgLowTemp = groupAverage(sorted, month, 'avg_low_temp_c');
    const avgPrecip = groupAverage(sorted, month, 'precipitation_cm');
    const avgInflation = groupAverage(sorted, month, 'inflation_rate');
    const avgHolidays = groupAverage(sorted, month, 'philippine_holiday_count');
    const avgTop10Holidays = groupAverage(sorted, month, 'top_10_market_holidays');

    futureRows.push({
      year,
      month,
      peak_season: month === 8 || month === 12 ? 1 : 0,
      philippine_holidays: Math.round(avgHolidays || 0),
      top10market_holidays: Math.round(avgTop10Holidays || 0),
      avg_hightemp: Number((avgHighTemp || 0).toFixed(2)),
      avg_lowtemp: Number((avgLowTemp || 0).toFixed(2)),
      precipitation: Number((avgPrecip || 0).toFixed(2)),
      inflation_rate: Number((avgInflation || 0).toFixed(2)),
      is_december: month === 12 ? 1 : 0,
      is_lockdown: 0,
      // Lag features — same last-known values for all future months (notebook V3 conservative approach)
      lag_1: lag1,
      lag_2: lag2,
      rolling_mean_3m: Number(rollingMean3m.toFixed(2)),
      growth_rate: growthRate,
      sudden_increase: 0,
    });
  }

  return futureRows;
}

async function predictRows(rows) {
  if (MODEL_SOURCE === 'colab') {
    return predictWithColab(rows);
  }

  return predictWithLocalModel(rows);
}

async function retrainLocalModel(options = {}) {
  const payload = {
    datasetPath: options.datasetPath,
    rows: options.rows,
    modelPath: options.modelPath || MODEL_FILE,
    metadataPath: options.metadataPath || MODEL_METADATA_FILE,
    modelVersion: options.modelVersion || `tourism-xgb-${Date.now()}`,
    baseModelName: options.baseModelName,
    cutoffYear: options.cutoffYear,
    cutoffMonth: options.cutoffMonth,
  };

  return runPythonScript(PYTHON_TRAIN_SCRIPT, payload);
}

/**
 * Shared output mapper for Python predict scripts that return
 * { historical_predictions, future_predictions } JSON.
 * @param {number} extraCount - Leading entries of future_predictions that correspond to
 *   post-CSV DB months with known actual arrivals (e.g. Jan-Mar 2026). They are mapped
 *   as ml-h- entries with DB actual arrivals + model predicted values.
 */
function mapPredictionOutput(output, historicalRows, extraCount = 0) {
  // Track which year-month keys are covered by the Python script's historical output
  const coveredKeys = new Set();

  const historicalForecasts = (output.historical_predictions || [])
    .filter((p) => p.predicted !== null && p.predicted !== undefined)
    .map((p) => {
      const dbRow = historicalRows.find(
        (r) => Number(r.year) === p.year && Number(r.month) === p.month_num,
      );
      const actual = dbRow ? Number(dbRow.arrivals) : (p.actual || 0);
      const predicted = Math.max(0, Math.round(Number(p.predicted || 0)));
      const monthPad = String(p.month_num).padStart(2, '0');
      coveredKeys.add(`${p.year}-${monthPad}`);
      return {
        id: `ml-h-${p.year}-${monthPad}`,
        actualOccupancy: actual,
        predictedOccupancy: predicted,
        error: Math.round(Math.abs(predicted - actual)),
        date: `${p.year}-${monthPad}-01`,
        location: 'Panglao',
        accommodationType: 'Tourist Arrivals',
      };
    });

  // Split future_predictions: first extraCount are post-CSV DB months with known actual arrivals.
  const allFuture = output.future_predictions || [];
  const extraPredictions = allFuture.slice(0, extraCount);
  const trueFuturePredictions = allFuture.slice(extraCount);

  // Post-CSV DB rows sorted to match the order they were passed to Python (chronological).
  const postCsvDbRows = historicalRows
    .filter((r) => Number(r.year) > 2025 && Number(r.arrivals) > 0)
    .sort((a, b) => (Number(a.year) - Number(b.year)) || (Number(a.month) - Number(b.month)));

  // Map extra predictions as ml-h- entries: DB actual arrivals + model predicted values.
  const extraHistoricalWithPredictions = extraPredictions.map((p, i) => {
    const dbRow = postCsvDbRows[i];
    const actual = dbRow ? Number(dbRow.arrivals) : 0;
    const predicted = Math.max(0, Math.round(Number(p.predicted || 0)));
    const monthPad = String(p.month).padStart(2, '0');
    coveredKeys.add(`${p.year}-${monthPad}`);
    return {
      id: `ml-h-${p.year}-${monthPad}`,
      actualOccupancy: actual,
      predictedOccupancy: predicted,
      error: Math.round(Math.abs(predicted - actual)),
      date: `${p.year}-${monthPad}-01`,
      location: 'Panglao',
      accommodationType: 'Tourist Arrivals',
    };
  });

  // Fallback: any remaining DB rows not covered (e.g. when extraCount = 0, or future gaps).
  const extraHistoricalFallback = historicalRows
    .filter((r) => {
      const monthPad = String(r.month).padStart(2, '0');
      return !coveredKeys.has(`${r.year}-${monthPad}`) && Number(r.arrivals) > 0;
    })
    .map((r) => {
      const monthPad = String(r.month).padStart(2, '0');
      const actual = Number(r.arrivals);
      return {
        id: `ml-h-${r.year}-${monthPad}`,
        actualOccupancy: actual,
        predictedOccupancy: 0,
        error: 0,
        date: `${r.year}-${monthPad}-01`,
        location: 'Panglao',
        accommodationType: 'Tourist Arrivals',
      };
    });

  const futureForecasts = trueFuturePredictions.map((p) => {
    const predicted = Math.max(0, Math.round(Number(p.predicted || 0)));
    const monthPad = String(p.month).padStart(2, '0');
    return {
      id: `ml-f-${p.year}-${monthPad}`,
      actualOccupancy: predicted,
      predictedOccupancy: predicted,
      error: 0,
      date: `${p.year}-${monthPad}-01`,
      location: 'Panglao',
      accommodationType: 'Tourist Arrivals (Forecast)',
    };
  });

  return [...historicalForecasts, ...extraHistoricalWithPredictions, ...extraHistoricalFallback, ...futureForecasts];
}

async function buildLSTMForecastSeries(monthlyRows, monthsAhead = 12) {
  const historicalRows = [...monthlyRows].sort((a, b) => (a.year - b.year) || (a.month - b.month));

  // Identify post-CSV DB rows (year > 2025) with actual arrivals — need predictions for these too
  const csvOnlyRows = historicalRows.filter((r) => Number(r.year) <= 2025);
  const postCsvRows = historicalRows
    .filter((r) => Number(r.year) > 2025 && Number(r.arrivals) > 0)
    .sort((a, b) => (Number(a.year) - Number(b.year)) || (Number(a.month) - Number(b.month)));

  const nc = csvOnlyRows.length;
  const csvLastArrivals = [
    nc >= 3 ? Number(csvOnlyRows[nc - 3].arrivals || 0) : 0,
    nc >= 2 ? Number(csvOnlyRows[nc - 2].arrivals || 0) : 0,
    nc >= 1 ? Number(csvOnlyRows[nc - 1].arrivals || 0) : 0,
  ];

  const mapLstmFeatures = (row) => ({
    year: row.year,
    month: row.month,
    top10market_holidays: row.top10market_holidays,
    avg_hightemp: row.avg_hightemp,
    avg_lowtemp: row.avg_lowtemp,
    precipitation: row.precipitation,
    inflation_rate: row.inflation_rate,
    is_december: row.is_december,
    is_lockdown: row.is_lockdown,
  });

  // Extra feature rows for post-CSV months (autoregressive from CSV end inside Python)
  const extraFutureMonths = buildFutureRows(csvOnlyRows, postCsvRows.length, csvLastArrivals)
    .map(mapLstmFeatures);

  const n = historicalRows.length;
  const lastArrivals = [
    n >= 3 ? Number(historicalRows[n - 3].arrivals || 0) : 0,
    n >= 2 ? Number(historicalRows[n - 2].arrivals || 0) : 0,
    n >= 1 ? Number(historicalRows[n - 1].arrivals || 0) : 0,
  ];

  // True future months (starting after last DB row)
  const trueFutureMonths = buildFutureRows(historicalRows, monthsAhead, lastArrivals)
    .map(mapLstmFeatures);

  const futureMonths = [...extraFutureMonths, ...trueFutureMonths];

  const output = await runPythonScript(PYTHON_LSTM_PREDICT_SCRIPT, {
    datasetPath: LSTM_DATASET_PATH,
    scalerPath: LSTM_SCALER_PATH,
    modelPath: LSTM_MODEL_PATH,
    futureMonths,
  });

  if (!output.future_predictions || !output.historical_predictions) {
    throw new Error('Invalid LSTM prediction output.');
  }

  return mapPredictionOutput(output, historicalRows, postCsvRows.length);
}

async function buildXGBoostZipForecastSeries(monthlyRows, monthsAhead = 12) {
  const historicalRows = [...monthlyRows].sort((a, b) => (a.year - b.year) || (a.month - b.month));

  // Identify post-CSV DB rows (year > 2025) with actual arrivals — need predictions for these too
  const csvOnlyRows = historicalRows.filter((r) => Number(r.year) <= 2025);
  const postCsvRows = historicalRows
    .filter((r) => Number(r.year) > 2025 && Number(r.arrivals) > 0)
    .sort((a, b) => (Number(a.year) - Number(b.year)) || (Number(a.month) - Number(b.month)));

  const mapXgbFeatures = (r) => ({
    year: r.year,
    month: r.month,
    peak_season: r.peak_season,
    philippine_holidays: r.philippine_holidays,
    top10market_holidays: r.top10market_holidays,
    avg_hightemp: r.avg_hightemp,
    avg_lowtemp: r.avg_lowtemp,
    precipitation: r.precipitation,
    inflation_rate: r.inflation_rate,
    is_december: r.is_december,
    is_lockdown: r.is_lockdown,
  });

  // Extra feature rows for post-CSV months (autoregressive from CSV end inside Python)
  const extraFutureMonths = buildFutureRows(csvOnlyRows, postCsvRows.length).map(mapXgbFeatures);
  // True future months (starting after last DB row)
  const trueFutureMonths = buildFutureRows(historicalRows, monthsAhead).map(mapXgbFeatures);
  const futureMonths = [...extraFutureMonths, ...trueFutureMonths];

  const output = await runPythonScript(PYTHON_XGBOOST_ZIP_SCRIPT, {
    datasetPath: DATASET_PATH,
    zipPath: XGBOOST_ZIP_PATH,
    futureMonths,
  });

  if (!output.historical_predictions || !output.future_predictions) {
    throw new Error('Invalid XGBoost zip prediction output.');
  }

  return mapPredictionOutput(output, historicalRows, postCsvRows.length);
}

async function buildRFForecastSeries(monthlyRows, monthsAhead = 12) {
  const historicalRows = [...monthlyRows].sort((a, b) => (a.year - b.year) || (a.month - b.month));

  // Identify post-CSV DB rows (year > 2025) with actual arrivals — need predictions for these too
  const csvOnlyRows = historicalRows.filter((r) => Number(r.year) <= 2025);
  const postCsvRows = historicalRows
    .filter((r) => Number(r.year) > 2025 && Number(r.arrivals) > 0)
    .sort((a, b) => (Number(a.year) - Number(b.year)) || (Number(a.month) - Number(b.month)));

  const mapRfFeatures = (r) => ({
    year: r.year,
    month: r.month,
    peak_season: r.peak_season,
    philippine_holidays: r.philippine_holidays,
    top10market_holidays: r.top10market_holidays,
    avg_hightemp: r.avg_hightemp,
    avg_lowtemp: r.avg_lowtemp,
    precipitation: r.precipitation,
    inflation_rate: r.inflation_rate,
    is_december: r.is_december,
    is_lockdown: r.is_lockdown,
  });

  // Extra feature rows for post-CSV months (autoregressive from CSV end inside Python)
  const extraFutureMonths = buildFutureRows(csvOnlyRows, postCsvRows.length).map(mapRfFeatures);
  // True future months (starting after last DB row)
  const trueFutureMonths = buildFutureRows(historicalRows, monthsAhead).map(mapRfFeatures);
  const futureMonths = [...extraFutureMonths, ...trueFutureMonths];

  const output = await runPythonScript(PYTHON_RF_SCRIPT, {
    datasetPath: DATASET_PATH,
    zipPath: RF_ZIP_PATH,
    futureMonths,
  });

  if (!output.historical_predictions || !output.future_predictions) {
    throw new Error('Invalid Random Forest prediction output.');
  }

  return mapPredictionOutput(output, historicalRows, postCsvRows.length);
}

async function buildProphetForecastSeries(monthlyRows, monthsAhead = 12) {
  const historicalRows = [...monthlyRows].sort((a, b) => (a.year - b.year) || (a.month - b.month));

  // Identify post-CSV DB rows (year > 2025) with actual arrivals — need predictions for these too
  const csvOnlyRows = historicalRows.filter((r) => Number(r.year) <= 2025);
  const postCsvRows = historicalRows
    .filter((r) => Number(r.year) > 2025 && Number(r.arrivals) > 0)
    .sort((a, b) => (Number(a.year) - Number(b.year)) || (Number(a.month) - Number(b.month)));

  // Prophet only needs year + month for future dates
  const extraFutureMonths = buildFutureRows(csvOnlyRows, postCsvRows.length).map((r) => ({
    year: r.year,
    month: r.month,
  }));
  const trueFutureMonths = buildFutureRows(historicalRows, monthsAhead).map((r) => ({
    year: r.year,
    month: r.month,
  }));
  const futureMonths = [...extraFutureMonths, ...trueFutureMonths];

  const output = await runPythonScript(PYTHON_PROPHET_SCRIPT, {
    datasetPath: DATASET_PATH,
    zipPath: PROPHET_ZIP_PATH,
    futureMonths,
  });

  if (!output.historical_predictions || !output.future_predictions) {
    throw new Error('Invalid Prophet prediction output.');
  }

  return mapPredictionOutput(output, historicalRows, postCsvRows.length);
}

async function buildForecastSeries(monthlyRows, monthsAhead = 12) {
  if (ML_MODEL === 'lstm') return buildLSTMForecastSeries(monthlyRows, monthsAhead);
  if (ML_MODEL === 'random_forest' || ML_MODEL === 'rf') return buildRFForecastSeries(monthlyRows, monthsAhead);
  if (ML_MODEL === 'prophet') return buildProphetForecastSeries(monthlyRows, monthsAhead);
  // Default: XGBoost from db zip
  return buildXGBoostZipForecastSeries(monthlyRows, monthsAhead);
}

async function retrainLSTMModel(options = {}) {
  const payload = {
    rows: options.rows,
    modelPath: options.modelPath || LSTM_MODEL_PATH,
    scalerPath: options.scalerPath || LSTM_SCALER_PATH,
    cutoffYear: options.cutoffYear,
    cutoffMonth: options.cutoffMonth,
  };
  return runPythonScript(PYTHON_TRAIN_LSTM_SCRIPT, payload);
}

async function retrainRFModel(options = {}) {
  const payload = {
    rows: options.rows,
    zipPath: options.zipPath || RF_ZIP_PATH,
    cutoffYear: options.cutoffYear,
    cutoffMonth: options.cutoffMonth,
  };
  return runPythonScript(PYTHON_TRAIN_RF_SCRIPT, payload);
}

async function retrainProphetModel(options = {}) {
  const payload = {
    rows: options.rows,
    zipPath: options.zipPath || PROPHET_ZIP_PATH,
    cutoffYear: options.cutoffYear,
    cutoffMonth: options.cutoffMonth,
  };
  return runPythonScript(PYTHON_TRAIN_PROPHET_SCRIPT, payload);
}

module.exports = {
  MODEL_FEATURES,
  MODEL_FILE,
  MODEL_METADATA_FILE,
  ML_MODEL,
  monthNameToNumber,
  getModelStatus,
  retrainLocalModel,
  retrainLSTMModel,
  retrainRFModel,
  retrainProphetModel,
  buildForecastSeries,
  buildLSTMForecastSeries,
  buildXGBoostZipForecastSeries,
  buildRFForecastSeries,
  buildProphetForecastSeries,
};
