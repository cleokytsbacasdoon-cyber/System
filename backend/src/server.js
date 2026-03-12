const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const { query } = require('./db');

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
    const result = await query('SELECT * FROM retraining_jobs ORDER BY start_time DESC');
    res.json(result.rows.map(mapRetrainingJob));
  } catch (error) {
    next(error);
  }
});

app.post('/api/retraining/jobs', async (req, res, next) => {
  try {
    const { modelId } = req.body;
    if (!modelId) return res.status(400).json({ error: 'modelId is required' });

    const jobId = `job-${Date.now()}`;
    const result = await query(
      'INSERT INTO retraining_jobs (id, model_id, status, start_time) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [jobId, modelId, 'pending']
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
    if (result.rowCount === 0) return res.status(404).json({ error: 'Data quality record not found' });
    res.json(mapDataQuality(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.get('/api/forecasts', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM demand_forecasts ORDER BY date DESC LIMIT 60');
    res.json(result.rows.map(mapDemandForecast));
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

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error', details: error.message });
});

app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
});
