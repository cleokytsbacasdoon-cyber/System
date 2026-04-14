"""
train_random_forest.py — Retrain the Random Forest model on new/expanded data.

Input  (stdin JSON):
  rows       – list of training payload rows (same format as toTrainingPayloadRow)
  zipPath    – where to save the updated model zip  (default: db/random_forest_optimized.zip)
  cutoffYear / cutoffMonth – for metadata only

Output (stdout JSON):
  modelVersion, algorithm, metrics { mape_train, mape_test, mae_train, rmse_train, r2_train, … }
"""
import io
import json
import os
import sys
import warnings
import zipfile
from datetime import datetime, UTC

import joblib
import numpy as np
import pandas as pd

warnings.filterwarnings('ignore')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..', 'db'))
DEFAULT_ZIP_PATH = os.path.join(DB_DIR, 'random_forest_optimized.zip')

# Feature order — must match predict_random_forest.py
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

MONTH_TO_NUMBER = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4,
    'may': 5, 'june': 6, 'july': 7, 'august': 8,
    'september': 9, 'october': 10, 'november': 11, 'december': 12,
}


def month_to_num(val):
    if isinstance(val, (int, float)):
        return int(val)
    return MONTH_TO_NUMBER.get(str(val).lower().strip(), 0)


def prepare_dataframe(rows):
    """Convert payload rows to DataFrame with all RF features."""
    df = pd.DataFrame(rows)
    df['Month_Num'] = df['Month'].apply(month_to_num)
    df = df.sort_values(['Year', 'Month_Num']).reset_index(drop=True)
    df['Arrivals'] = pd.to_numeric(df['Arrivals'], errors='coerce').fillna(0)

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
    df['Total_Holidays'] = pd.to_numeric(df.get('Philippine_Holidays', 0), errors='coerce').fillna(0) \
                         + pd.to_numeric(df.get('Top10Market_Holidays', 0), errors='coerce').fillna(0)
    df['Holiday_Interaction'] = df['Total_Holidays'] * pd.to_numeric(df.get('Peak_Season', 0), errors='coerce').fillna(0)

    # Temperature derived
    df['Temp_Range'] = pd.to_numeric(df.get('Avg_HighTemp', 0), errors='coerce').fillna(0) \
                     - pd.to_numeric(df.get('Avg_LowTemp', 0), errors='coerce').fillna(0)
    df['Temp_Avg'] = (pd.to_numeric(df.get('Avg_HighTemp', 0), errors='coerce').fillna(0)
                    + pd.to_numeric(df.get('Avg_LowTemp', 0), errors='coerce').fillna(0)) / 2.0

    # Cyclical month encoding
    df['Month_Sin'] = np.sin(2 * np.pi * df['Month_Num'] / 12)
    df['Month_Cos'] = np.cos(2 * np.pi * df['Month_Num'] / 12)

    # Ensure Year and numeric columns are correct type
    df['Year'] = pd.to_numeric(df['Year'], errors='coerce').fillna(0)

    for col in FEATURE_ORDER:
        if col not in df.columns:
            df[col] = 0.0
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    return df, float(q75)


def load_model_from_zip(zip_path):
    """Load sklearn RF model from zip archive."""
    with zipfile.ZipFile(zip_path) as zf:
        rf_bytes = zf.read('random_forest_model.pkl')
    return joblib.load(io.BytesIO(rf_bytes))


def save_model_to_zip(model, zip_path):
    """Save sklearn RF model back to zip archive (atomic write)."""
    buf = io.BytesIO()
    joblib.dump(model, buf)
    buf.seek(0)
    tmp_path = zip_path + '.tmp'
    with zipfile.ZipFile(tmp_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('random_forest_model.pkl', buf.getvalue())
    os.replace(tmp_path, zip_path)


def compute_mape(actual, predicted):
    mask = actual > 0
    if mask.sum() == 0:
        return 100.0
    return float(np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100)


def main():
    raw_stdin = '' if sys.stdin.isatty() else sys.stdin.read().strip()
    payload = json.loads(raw_stdin) if raw_stdin else {}

    payload_rows = payload.get('rows')
    zip_path = payload.get('zipPath') or DEFAULT_ZIP_PATH
    cutoff_year = payload.get('cutoffYear')
    cutoff_month = payload.get('cutoffMonth')

    if not payload_rows or not isinstance(payload_rows, list):
        print(json.dumps({'error': 'No rows provided'}), flush=True)
        sys.exit(1)

    df, q75 = prepare_dataframe(payload_rows)

    if len(df) < 4:
        print(json.dumps({'error': f'Not enough rows to train RF (need >4, got {len(df)})'}), flush=True)
        sys.exit(1)

    X = df[FEATURE_ORDER]
    y = df['Arrivals']

    # 80/20 time-based split
    split = max(1, int(len(df) * 0.8))
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]

    # Load existing model (reuse its hyperparameters) or fallback to a new one
    model = None
    if os.path.isfile(zip_path):
        try:
            model = load_model_from_zip(zip_path)
        except Exception:
            model = None

    if model is None:
        from sklearn.ensemble import RandomForestRegressor
        model = RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1)

    # Full retrain — sklearn fit() replaces all previous trees
    model.fit(X_train, y_train)

    # Metrics
    preds_train = np.maximum(0, model.predict(X_train))
    a_train = y_train.to_numpy()
    mape_train = compute_mape(a_train, preds_train)
    mae_train = float(np.abs(preds_train - a_train).mean())
    rmse_train = float(np.sqrt(((preds_train - a_train) ** 2).mean()))
    ss_res = float(((a_train - preds_train) ** 2).sum())
    ss_tot = float(((a_train - a_train.mean()) ** 2).sum())
    r2_train = float(1 - ss_res / ss_tot) if ss_tot > 0 else 0.0

    mape_test, mae_test, rmse_test, r2_test = mape_train, mae_train, rmse_train, r2_train
    if len(X_test) > 0:
        preds_test = np.maximum(0, model.predict(X_test))
        a_test = y_test.to_numpy()
        mape_test = compute_mape(a_test, preds_test)
        mae_test = float(np.abs(preds_test - a_test).mean())
        rmse_test = float(np.sqrt(((preds_test - a_test) ** 2).mean()))
        ss_res_t = float(((a_test - preds_test) ** 2).sum())
        ss_tot_t = float(((a_test - a_test.mean()) ** 2).sum())
        r2_test = float(1 - ss_res_t / ss_tot_t) if ss_tot_t > 0 else 0.0

    # Save updated model — atomic replace
    save_model_to_zip(model, zip_path)

    result = {
        'modelVersion': f'random_forest_{cutoff_year}_{cutoff_month}',
        'algorithm': 'random_forest',
        'cutoffYear': cutoff_year,
        'cutoffMonth': cutoff_month,
        'trainedAtUtc': datetime.now(UTC).isoformat().replace('+00:00', 'Z'),
        'zipPath': zip_path,
        'metrics': {
            'mape_train': mape_train,
            'mape_test': mape_test,
            'mae_train': mae_train,
            'rmse_train': rmse_train,
            'r2_train': r2_train,
            'mae_test': mae_test,
            'rmse_test': rmse_test,
            'r2_test': r2_test,
            'rowCount': int(len(df)),
            'trainCount': int(len(X_train)),
            'testCount': int(len(X_test)),
        },
    }

    print(json.dumps(result), flush=True)


if __name__ == '__main__':
    main()
