/**
 * Open-Meteo Weather Service
 * Free API — no key required.
 * Docs: https://open-meteo.com/en/docs/historical-weather-api
 *
 * Change LATITUDE / LONGITUDE below to match your study area.
 * Default: Panglao, Bohol, Philippines
 */

const LATITUDE = 9.5728;
const LONGITUDE = 123.7553;
const TIMEZONE = 'Asia%2FManila';

// Fallback values used when the API is unreachable
const FALLBACK_HIGH = [30.6, 31.2, 32.0, 32.4, 33.1, 32.8, 31.9, 31.6, 31.5, 31.2, 30.9, 30.7];
const FALLBACK_LOW  = [23.7, 24.0, 24.6, 25.1, 25.4, 25.2, 24.9, 24.8, 24.7, 24.5, 24.1, 23.9];
const FALLBACK_PREC = [7.2,  6.8,  5.9,  4.8,  9.4, 14.7, 17.3, 16.2, 15.8, 18.1, 13.4, 10.2];

export interface MonthlyWeather {
  avgHighTemp: number;   // °C
  avgLowTemp: number;    // °C
  totalPrecipitation: number; // cm
  source: 'api' | 'fallback';
}

function average(arr: number[]): number {
  const valid = arr.filter((v) => v !== null && !isNaN(v));
  if (!valid.length) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/**
 * Fetch monthly averaged temperature and precipitation for a given month.
 * @param year  Full year, e.g. 2026
 * @param month 0-based month index (0 = January, 11 = December)
 */
export async function fetchMonthlyWeather(
  year: number,
  month: number
): Promise<MonthlyWeather> {
  const pad = (n: number) => String(n).padStart(2, '0');
  const mm = pad(month + 1);
  const lastDay = new Date(year, month + 1, 0).getDate();

  // Use up to yesterday to avoid incomplete current-day data
  const today = new Date();
  let endDay = lastDay;
  if (year === today.getFullYear() && month === today.getMonth()) {
    endDay = Math.max(1, today.getDate() - 1);
  }

  const startDate = `${year}-${mm}-01`;
  const endDate   = `${year}-${mm}-${pad(endDay)}`;

  const url =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${LATITUDE}&longitude=${LONGITUDE}` +
    `&start_date=${startDate}&end_date=${endDate}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&timezone=${TIMEZONE}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const maxTemps: number[] = data.daily?.temperature_2m_max ?? [];
    const minTemps: number[] = data.daily?.temperature_2m_min ?? [];
    const precip:   number[] = data.daily?.precipitation_sum  ?? [];

    if (!maxTemps.length) throw new Error('Empty response');

    return {
      avgHighTemp:        parseFloat(average(maxTemps).toFixed(1)),
      avgLowTemp:         parseFloat(average(minTemps).toFixed(1)),
      totalPrecipitation: parseFloat((precip.reduce((a, b) => a + (b ?? 0), 0) / 10).toFixed(1)), // mm → cm
      source: 'api',
    };
  } catch {
    // Silently fall back to climatological averages
    return {
      avgHighTemp:        FALLBACK_HIGH[month],
      avgLowTemp:         FALLBACK_LOW[month],
      totalPrecipitation: FALLBACK_PREC[month],
      source: 'fallback',
    };
  }
}
