import json
import os
import sys
import warnings
import zipfile

import numpy as np
import pandas as pd
import xgboost as xgb

warnings.filterwarnings('ignore')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..', 'db'))

# Feature order exactly as embedded in xgboost_best_model.json from xgboost_model.zip
FEATURE_ORDER = [
    'Peak_Season',
    'Philippine_Holidays',
    'Top10Market_Holidays',
    'Avg_HighTemp',
    'Avg_LowTemp',
    'Precipitation',
    'Lag_1',
    'Lag_2',
    'Rolling_Mean_3m',
    'Year',
    'Month_Num',
    'Growth_Rate',
    'Sudden_Increase',
    'Inflation_Rate',
    'is_December',
    'is_Lockdown',
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


def extract_zip_if_needed(zip_path, extract_dir):
    if not os.path.isdir(extract_dir):
        os.makedirs(extract_dir, exist_ok=True)
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(extract_dir)


def load_model(zip_path):
    extract_dir = zip_path.replace('.zip', '_extracted')
    extract_zip_if_needed(zip_path, extract_dir)
    model = xgb.XGBRegressor()
    model.load_model(os.path.join(extract_dir, 'xgboost_best_model.json'))
    return model


def load_dataset(dataset_path):
    """Load CSV, compute lag/rolling/growth features, return df and training q75."""
    df = pd.read_csv(dataset_path)
    df['Month_Num'] = df['Month'].apply(month_to_num)
    df['Lag_1'] = df['Arrivals'].shift(1).bfill()
    df['Lag_2'] = df['Arrivals'].shift(2).bfill()
    df['Rolling_Mean_3m'] = df['Arrivals'].rolling(window=3, min_periods=1).mean()
    df['Growth_Rate'] = df['Arrivals'].pct_change().fillna(0) * 100.0
    q75 = df['Growth_Rate'].quantile(0.75)
    df['Sudden_Increase'] = (df['Growth_Rate'] > q75).astype(int)
    return df, float(q75)


def main():
    raw_stdin = '' if sys.stdin.isatty() else sys.stdin.read().strip()
    payload = json.loads(raw_stdin) if raw_stdin else {}

    dataset_path = payload.get('datasetPath', os.path.join(DB_DIR, '2016 - 2025 datasets.csv'))
    zip_path = payload.get('zipPath', os.path.join(DB_DIR, 'xgboost_model.zip'))
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
    future_predictions = []

    for frow in future_months:
        lag1 = arrivals_history[-1] if arrivals_history else 0.0
        lag2 = arrivals_history[-2] if len(arrivals_history) >= 2 else lag1
        rolling3m = float(np.mean(arrivals_history[-3:])) if len(arrivals_history) >= 3 \
            else float(np.mean(arrivals_history) if arrivals_history else 0.0)
        growth_rate = float((lag1 - lag2) / lag2 * 100) if lag2 > 0 else 0.0
        sudden_increase = 1 if growth_rate > q75 else 0

        year = int(frow.get('year', 0))
        month = int(frow.get('month', 0))

        feat = pd.DataFrame([{
            'Peak_Season': int(frow.get('peak_season', 0)),
            'Philippine_Holidays': int(frow.get('philippine_holidays', 0)),
            'Top10Market_Holidays': float(frow.get('top10market_holidays', 0)),
            'Avg_HighTemp': float(frow.get('avg_hightemp', 0)),
            'Avg_LowTemp': float(frow.get('avg_lowtemp', 0)),
            'Precipitation': float(frow.get('precipitation', 0)),
            'Lag_1': lag1,
            'Lag_2': lag2,
            'Rolling_Mean_3m': rolling3m,
            'Year': year,
            'Month_Num': month,
            'Growth_Rate': growth_rate,
            'Sudden_Increase': sudden_increase,
            'Inflation_Rate': float(frow.get('inflation_rate', 0)),
            'is_December': int(frow.get('is_december', 0)),
            'is_Lockdown': int(frow.get('is_lockdown', 0)),
        }])[FEATURE_ORDER]

        pred_int = round(max(0.0, float(model.predict(feat)[0])))
        future_predictions.append({'year': year, 'month': month, 'predicted': pred_int})
        arrivals_history.append(float(pred_int))

    print(json.dumps({
        'historical_predictions': historical_predictions,
        'future_predictions': future_predictions,
    }))


if __name__ == '__main__':
    main()
