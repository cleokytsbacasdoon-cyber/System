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

export interface MonthlyWeather {
  avgHighTemp: number | null;   // °C
  avgLowTemp: number | null;    // °C
  totalPrecipitation: number | null; // cm
  source: 'api' | 'unavailable';
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
    // Return explicit unavailable state instead of synthetic fallback values.
    return {
      avgHighTemp: null,
      avgLowTemp: null,
      totalPrecipitation: null,
      source: 'unavailable',
    };
  }
}
