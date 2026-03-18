const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { pool } = require('../db');

const DATASET_CSV_PATH = path.resolve(__dirname, '../../db/dataset.csv');

const MONTH_TO_NUMBER = {
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

function parseMonthlyDatasetCsv(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  return lines.slice(1).map((line) => {
    const [
      year,
      monthName,
      arrivals,
      peakSeason,
      philippineHolidays,
      top10MarketHolidays,
      avgHighTemp,
      avgLowTemp,
      precipitation,
      inflationRate,
      isDecember,
      isLockdown,
    ] = line.split(',');

    const month = MONTH_TO_NUMBER[String(monthName).toLowerCase()];
    if (!month) {
      throw new Error(`Invalid month name in dataset.csv: ${monthName}`);
    }

    return {
      year: Number(year),
      month,
      arrivals: Number(arrivals),
      avgHighTempC: Number(avgHighTemp),
      avgLowTempC: Number(avgLowTemp),
      precipitationCm: Number(precipitation),
      inflationRate: Number(inflationRate),
      isPeakSeason: Number(peakSeason) === 1,
      isDecember: Number(isDecember) === 1,
      isLockdown: Number(isLockdown) === 1,
      philippineHolidayCount: Number(philippineHolidays),
      top10MarketHolidays: top10MarketHolidays,
    };
  });
}

async function upsertMonthlyDataset(client, records) {
  const upsertSql = `
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
      top_10_market_holidays,
      updated_at
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
  `;

  for (const record of records) {
    await client.query(upsertSql, [
      record.year,
      record.month,
      record.arrivals,
      record.avgHighTempC,
      record.avgLowTempC,
      record.precipitationCm,
      record.inflationRate,
      record.isPeakSeason,
      record.isDecember,
      record.isLockdown,
      record.philippineHolidayCount,
      String(record.top10MarketHolidays),
    ]);
  }
}

async function init() {
  const sqlPath = path.resolve(__dirname, '../../db/init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const csv = fs.readFileSync(DATASET_CSV_PATH, 'utf8');
  const datasetRows = parseMonthlyDatasetCsv(csv);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await upsertMonthlyDataset(client, datasetRows);
    await client.query('COMMIT');
    console.log('Database initialized successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to initialize database:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

init();
