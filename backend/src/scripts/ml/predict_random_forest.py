import io
import json
import os
import sys
import warnings
import zipfile

import joblib
import numpy as np
import pandas as pd

warnings.filterwarnings('ignore')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..', 'db'))

# Feature order exactly as in features_v3.json from random_forest_optimized.zip
FEATURE_ORDER = [
    'Peak_Season',
    'Philippine_Holidays',
    'Top10Market_Holidays',
    'Avg_HighTemp',
    'Avg_LowTemp',
    'Precipitation',
    'Inflation_Rate',
    'is_December',
    'is_Lockdown',
    'Lag_1',
    'Lag_2',
    'Lag_3',
    'Rolling_Mean_3',
    'Rolling_Mean_6',
    'Rolling_Std_3',
    'Growth_Rate',
    'Growth_Rate_Lag_1',
    'Sudden_Increase',
    'Total_Holidays',
    'Holiday_Interaction',
    'Temp_Range',
    'Temp_Avg',
    'Month_Sin',
    'Month_Cos',
    'Year',
]

MONTH_NAME_TO_NUM = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4,
    'may': 5, 'june': 6, 'july': 7, 'august': 8,
    'september': 9, 'october': 10, 'november': 11, 'december': 12,
}


def month_to_num(val):
    if isinstance(val, (int, float)):
        return int(val)
    return MONTH_NAME_TO_NUM.get(str(val).lower().strip(), 0)


def load_model(zip_path):
    with zipfile.ZipFile(zip_path) as zf:
        rf_bytes = zf.read('random_forest_model.pkl')
    return joblib.load(io.BytesIO(rf_bytes))


def load_dataset(dataset_path):
    """Load CSV and compute all 25 RF features."""
    df = pd.read_csv(dataset_path)
    df['Month_Num'] = df['Month'].apply(month_to_num)

    # Lag features
    df['Lag_1'] = df['Arrivals'].shift(1).bfill()
    df['Lag_2'] = df['Arrivals'].shift(2).bfill()
    df['Lag_3'] = df['Arrivals'].shift(3).bfill()

    # Rolling aggregates
    df['Rolling_Mean_3'] = df['Arrivals'].rolling(window=3, min_periods=1).mean()
    df['Rolling_Mean_6'] = df['Arrivals'].rolling(window=6, min_periods=1).mean()
    df['Rolling_Std_3'] = df['Arrivals'].rolling(window=3, min_periods=2).std(ddof=1).fillna(0.0)

    # Growth features
    df['Growth_Rate'] = df['Arrivals'].pct_change().fillna(0) * 100.0
    df['Growth_Rate_Lag_1'] = df['Growth_Rate'].shift(1).fillna(0.0)
    q75 = df['Growth_Rate'].quantile(0.75)
    df['Sudden_Increase'] = (df['Growth_Rate'] > q75).astype(int)

    # Holiday interaction features
    df['Total_Holidays'] = df['Philippine_Holidays'] + df['Top10Market_Holidays']
    df['Holiday_Interaction'] = df['Total_Holidays'] * df['Peak_Season']

    # Temperature derived features
    df['Temp_Range'] = df['Avg_HighTemp'] - df['Avg_LowTemp']
    df['Temp_Avg'] = (df['Avg_HighTemp'] + df['Avg_LowTemp']) / 2.0

    # Cyclical month encoding
    df['Month_Sin'] = np.sin(2 * np.pi * df['Month_Num'] / 12)
    df['Month_Cos'] = np.cos(2 * np.pi * df['Month_Num'] / 12)

    return df, float(q75)


def build_future_feature_row(frow, arrivals_history, growth_rate_history, q75):
    """Build one future feature row for the RF model."""
    la = arrivals_history
    lag1 = la[-1] if la else 0.0
    lag2 = la[-2] if len(la) >= 2 else lag1
    lag3 = la[-3] if len(la) >= 3 else lag2

    rolling3 = float(np.mean(la[-3:])) if len(la) >= 3 else float(np.mean(la) if la else 0.0)
    rolling6 = float(np.mean(la[-6:])) if len(la) >= 6 else float(np.mean(la) if la else 0.0)

    # Std with ddof=1; need at least 2 samples
    recents = la[-3:] if len(la) >= 3 else la
    rolling_std3 = float(np.std(recents, ddof=1)) if len(recents) >= 2 else 0.0

    growth_rate = float((lag1 - lag2) / lag2 * 100) if lag2 > 0 else 0.0
    growth_rate_lag1 = growth_rate_history[-1] if growth_rate_history else 0.0
    sudden_increase = 1 if growth_rate > q75 else 0

    month = int(frow.get('month', 0))
    avg_high = float(frow.get('avg_hightemp', 0))
    avg_low = float(frow.get('avg_lowtemp', 0))
    philippine_hols = int(frow.get('philippine_holidays', 0))
    top10_hols = float(frow.get('top10market_holidays', 0))
    peak = int(frow.get('peak_season', 0))
    total_holidays = philippine_hols + top10_hols

    return {
        'Peak_Season': peak,
        'Philippine_Holidays': philippine_hols,
        'Top10Market_Holidays': top10_hols,
        'Avg_HighTemp': avg_high,
        'Avg_LowTemp': avg_low,
        'Precipitation': float(frow.get('precipitation', 0)),
        'Inflation_Rate': float(frow.get('inflation_rate', 0)),
        'is_December': int(frow.get('is_december', 0)),
        'is_Lockdown': int(frow.get('is_lockdown', 0)),
        'Lag_1': lag1,
        'Lag_2': lag2,
        'Lag_3': lag3,
        'Rolling_Mean_3': rolling3,
        'Rolling_Mean_6': rolling6,
        'Rolling_Std_3': rolling_std3,
        'Growth_Rate': growth_rate,
        'Growth_Rate_Lag_1': growth_rate_lag1,
        'Sudden_Increase': sudden_increase,
        'Total_Holidays': total_holidays,
        'Holiday_Interaction': total_holidays * peak,
        'Temp_Range': avg_high - avg_low,
        'Temp_Avg': (avg_high + avg_low) / 2.0,
        'Month_Sin': np.sin(2 * np.pi * month / 12),
        'Month_Cos': np.cos(2 * np.pi * month / 12),
        'Year': int(frow.get('year', 0)),
    }


def main():
    raw_stdin = '' if sys.stdin.isatty() else sys.stdin.read().strip()
    payload = json.loads(raw_stdin) if raw_stdin else {}

    dataset_path = payload.get('datasetPath', os.path.join(DB_DIR, '2016 - 2025 datasets.csv'))
    zip_path = payload.get('zipPath', os.path.join(DB_DIR, 'random_forest_optimized.zip'))
    future_months = payload.get('futureMonths', [])

    model = load_model(zip_path)
    df, q75 = load_dataset(dataset_path)

    # --- Historical predictions ---
    hist_frame = df[FEATURE_ORDER]
    hist_preds = model.predict(hist_frame)

    historical_predictions = []
    for i, row in df.iterrows():
        historical_predictions.append({
            'year': int(row['Year']),
            'month_num': int(row['Month_Num']),
            'actual': int(row['Arrivals']),
            'predicted': round(max(0.0, float(hist_preds[i]))),
        })

    # --- Future predictions (autoregressive) ---
    arrivals_history = list(df['Arrivals'].values.astype(float))
    growth_rate_history = list(df['Growth_Rate'].values.astype(float))
    future_predictions = []

    for frow in future_months:
        feat_dict = build_future_feature_row(frow, arrivals_history, growth_rate_history, q75)
        feat = pd.DataFrame([feat_dict])[FEATURE_ORDER]

        pred_int = round(max(0.0, float(model.predict(feat)[0])))
        year = int(frow.get('year', 0))
        month = int(frow.get('month', 0))

        future_predictions.append({'year': year, 'month': month, 'predicted': pred_int})

        # Update autoregressive state
        gr = feat_dict['Growth_Rate']
        arrivals_history.append(float(pred_int))
        growth_rate_history.append(gr)

    print(json.dumps({
        'historical_predictions': historical_predictions,
        'future_predictions': future_predictions,
    }))


if __name__ == '__main__':
    main()
