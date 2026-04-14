"""
train_prophet.py — Retrain the Prophet model on new/expanded data.

Prophet does not support incremental fitting — a fresh model is created and
fitted on all available data each time.

Input  (stdin JSON):
  rows       – list of training payload rows (same format as toTrainingPayloadRow)
  zipPath    – where to save the updated model zip  (default: db/prophet_model.zip)
  cutoffYear / cutoffMonth – for metadata only

Output (stdout JSON):
  modelVersion, algorithm, metrics { mape_train, mape_test, … }
"""
import io
import json
import os
import sys
import warnings
import zipfile
from datetime import datetime, UTC

import numpy as np
import pandas as pd

warnings.filterwarnings('ignore')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..', 'db'))
DEFAULT_ZIP_PATH = os.path.join(DB_DIR, 'prophet_model.zip')

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
    """Convert payload rows to a Prophet-style DataFrame with ds + y."""
    df = pd.DataFrame(rows)
    df['month_num'] = df['Month'].apply(month_to_num)
    df = df.sort_values(['Year', 'month_num']).reset_index(drop=True)
    df['Arrivals'] = pd.to_numeric(df['Arrivals'], errors='coerce').fillna(0)

    df['ds'] = pd.to_datetime(
        df['Year'].astype(str) + '-' + df['month_num'].astype(str).str.zfill(2) + '-01'
    )
    df['y'] = df['Arrivals']
    return df


def get_existing_prophet_params(zip_path):
    """
    Try to extract Prophet model configuration from the existing zip.
    Returns a dict of init kwargs, or None if the file is unavailable.
    """
    try:
        from prophet.serialize import model_from_json

        if not os.path.isfile(zip_path):
            return None

        with zipfile.ZipFile(zip_path) as zf:
            raw = zf.read('prophet_best_model.json').decode('utf-8')

        model_json_str = json.loads(raw)
        existing = model_from_json(model_json_str)

        return {
            'changepoint_prior_scale': existing.changepoint_prior_scale,
            'seasonality_prior_scale': existing.seasonality_prior_scale,
            'holidays_prior_scale': existing.holidays_prior_scale,
            'seasonality_mode': existing.seasonality_mode,
            'yearly_seasonality': existing.yearly_seasonality,
            'weekly_seasonality': existing.weekly_seasonality,
            'daily_seasonality': existing.daily_seasonality,
        }
    except Exception:
        return None


def save_model_to_zip(model, zip_path):
    """Serialize Prophet model and save to zip (atomic write, double-encoded to match predict_prophet.py).

    predict_prophet.py does: model_json_str = json.loads(raw); model_from_json(model_json_str)
    model_from_json internally calls json.loads on its arg, so model_json_str must be a
    JSON-encoded string whose value is the Prophet model JSON text.
    model_to_json() already returns a JSON string — one json.dumps wraps it correctly.
    """
    from prophet.serialize import model_to_json

    model_json = model_to_json(model)      # already a JSON string (str)
    outer_json = json.dumps(model_json)    # encode the string once: json.loads(outer) → inner str
    tmp_path = zip_path + '.tmp'
    with zipfile.ZipFile(tmp_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('prophet_best_model.json', outer_json)
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

    df = prepare_dataframe(payload_rows)

    if len(df) < 4:
        print(json.dumps({'error': f'Not enough rows to train Prophet (need >4, got {len(df)})'}), flush=True)
        sys.exit(1)

    prophet_params = get_existing_prophet_params(zip_path) or {
        'changepoint_prior_scale': 0.05,
        'seasonality_prior_scale': 10.0,
        'seasonality_mode': 'multiplicative',
        'yearly_seasonality': True,
        'weekly_seasonality': False,
        'daily_seasonality': False,
    }

    # Suppress Stan/cmdstan at fit time
    from prophet import Prophet

    m = Prophet(**prophet_params)
    m.uncertainty_samples = 0

    # Fit on ALL available data so the saved model is as accurate as possible
    prophet_df = df[['ds', 'y']].copy()
    m.fit(prophet_df)

    # Compute retrospective metrics on the held-out 20% (hindcast)
    split = max(1, int(len(df) * 0.8))
    train_ds = prophet_df.iloc[:split][['ds']]
    test_ds = prophet_df.iloc[split:][['ds']]

    train_pred = m.predict(train_ds)
    train_lookup = dict(zip(train_pred['ds'].dt.to_pydatetime(), train_pred['yhat']))

    a_train = df['y'].iloc[:split].to_numpy()
    p_train = np.array([
        max(0.0, float(train_lookup.get(row['ds'].to_pydatetime(), 0)))
        for _, row in df.iloc[:split].iterrows()
    ])
    mape_train = compute_mape(a_train, p_train)
    mae_train = float(np.abs(p_train - a_train).mean())
    rmse_train = float(np.sqrt(((p_train - a_train) ** 2).mean()))
    ss_res = float(((a_train - p_train) ** 2).sum())
    ss_tot = float(((a_train - a_train.mean()) ** 2).sum())
    r2_train = float(1 - ss_res / ss_tot) if ss_tot > 0 else 0.0

    mape_test, mae_test, rmse_test, r2_test = mape_train, mae_train, rmse_train, r2_train
    if len(test_ds) > 0:
        test_pred = m.predict(test_ds)
        test_lookup = dict(zip(test_pred['ds'].dt.to_pydatetime(), test_pred['yhat']))

        a_test = df['y'].iloc[split:].to_numpy()
        p_test = np.array([
            max(0.0, float(test_lookup.get(row['ds'].to_pydatetime(), 0)))
            for _, row in df.iloc[split:].iterrows()
        ])
        mape_test = compute_mape(a_test, p_test)
        mae_test = float(np.abs(p_test - a_test).mean())
        rmse_test = float(np.sqrt(((p_test - a_test) ** 2).mean()))
        ss_res_t = float(((a_test - p_test) ** 2).sum())
        ss_tot_t = float(((a_test - a_test.mean()) ** 2).sum())
        r2_test = float(1 - ss_res_t / ss_tot_t) if ss_tot_t > 0 else 0.0

    # Save updated model — atomic replace
    save_model_to_zip(m, zip_path)

    result = {
        'modelVersion': f'prophet_{cutoff_year}_{cutoff_month}',
        'algorithm': 'prophet',
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
            'trainCount': split,
            'testCount': int(len(df)) - split,
        },
    }

    print(json.dumps(result), flush=True)


if __name__ == '__main__':
    main()
