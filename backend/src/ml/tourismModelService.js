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

function buildFutureRows(monthlyRows, monthsAhead = 12) {
  if (!monthlyRows.length) return [];

  const sorted = [...monthlyRows].sort((a, b) => (a.year - b.year) || (a.month - b.month));
  const last = sorted[sorted.length - 1];
  const futureRows = [];

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

async function buildForecastSeries(monthlyRows, monthsAhead = 12) {
  const historicalRows = [...monthlyRows].sort((a, b) => (a.year - b.year) || (a.month - b.month));
  const historicalFeatures = historicalRows.map(toFeatureRow);
  const historicalPredictions = await predictRows(historicalFeatures);

  const historicalForecasts = historicalRows.map((row, index) => {
    const actual = Number(row.arrivals);
    const predicted = Math.max(0, Number(historicalPredictions[index] || 0));
    const date = `${row.year}-${String(row.month).padStart(2, '0')}-01`;

    return {
      id: `ml-h-${row.year}-${String(row.month).padStart(2, '0')}`,
      actualOccupancy: actual,
      predictedOccupancy: Math.round(predicted),
      error: Math.round(Math.abs(predicted - actual)),
      date,
      location: 'Panglao',
      accommodationType: 'Tourist Arrivals',
    };
  });

  const futureFeatureRows = buildFutureRows(historicalRows, monthsAhead);
  if (!futureFeatureRows.length) {
    return historicalForecasts;
  }

  const futurePredictions = await predictRows(futureFeatureRows);

  const futureForecasts = futureFeatureRows.map((row, index) => {
    const predicted = Math.max(0, Number(futurePredictions[index] || 0));
    const date = `${row.year}-${String(row.month).padStart(2, '0')}-01`;

    return {
      id: `ml-f-${row.year}-${String(row.month).padStart(2, '0')}`,
      actualOccupancy: Math.round(predicted),
      predictedOccupancy: Math.round(predicted),
      error: 0,
      date,
      location: 'Panglao',
      accommodationType: 'Tourist Arrivals (Forecast)',
    };
  });

  return [...historicalForecasts, ...futureForecasts];
}

module.exports = {
  MODEL_FEATURES,
  MODEL_FILE,
  MODEL_METADATA_FILE,
  monthNameToNumber,
  getModelStatus,
  retrainLocalModel,
  buildForecastSeries,
};
