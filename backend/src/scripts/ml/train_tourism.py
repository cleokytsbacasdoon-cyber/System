import json
import os
import sys
from datetime import datetime, UTC

import numpy as np
import pandas as pd
import xgboost as xgb

MONTH_TO_NUMBER = {
    'january': 1,
    'february': 2,
    'march': 3,
    'april': 4,
    'may': 5,
    'june': 6,
    'july': 7,
    'august': 8,
    'september': 9,
    'october': 10,
    'november': 11,
    'december': 12,
}

# V3 feature set — matches the best-performing version from the thesis notebook.
# Lag/derived features are computed from the arrivals column during normalization.
FEATURE_COLUMNS = [
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
]

# Optuna-tuned best hyperparameters from the thesis notebook (trial 19, test RMSE ≈ 2294).
# These are used directly — no need to re-run Optuna on each retrain.
BEST_PARAMS = {
    'n_estimators': 400,
    'max_depth': 2,
    'learning_rate': 0.036306443636682215,
    'subsample': 0.8531945911995203,
    'colsample_bytree': 0.8995708310976516,
    'reg_alpha': 0.7062321565122543,
    'reg_lambda': 0.7549611362574712,
}


def normalize_dataset(df):
    normalized = df.rename(columns={
        'Year': 'year',
        'Month': 'month_name',
        'Arrivals': 'arrivals',
        'Peak_Season': 'peak_season',
        'Philippine_Holidays': 'philippine_holidays',
        'Top10Market_Holidays': 'top10market_holidays',
        'Avg_HighTemp': 'avg_hightemp',
        'Avg_LowTemp': 'avg_lowtemp',
        'Precipitation': 'precipitation',
        'Inflation_Rate': 'inflation_rate',
        'is_December': 'is_december',
        'is_Lockdown': 'is_lockdown',
    })

    normalized['month'] = normalized['month_name'].str.lower().map(MONTH_TO_NUMBER)

    if normalized['month'].isnull().any():
        bad_rows = normalized[normalized['month'].isnull()]['month_name'].dropna().tolist()
        raise ValueError(f'Invalid month names in dataset: {bad_rows}')

    numeric_cols = [
        'year',
        'arrivals',
        'peak_season',
        'philippine_holidays',
        'top10market_holidays',
        'avg_hightemp',
        'avg_lowtemp',
        'precipitation',
        'inflation_rate',
        'is_december',
        'is_lockdown',
        'month',
    ]

    for col in numeric_cols:
        normalized[col] = pd.to_numeric(normalized[col], errors='coerce')

    # Sort chronologically before computing lag/rolling features
    normalized = normalized.sort_values(['year', 'month']).reset_index(drop=True)

    # --- Lag features (exact formulas from thesis notebook V3) ---
    normalized['lag_1'] = normalized['arrivals'].shift(1)
    normalized['lag_2'] = normalized['arrivals'].shift(2)
    normalized['rolling_mean_3m'] = normalized['arrivals'].rolling(window=3, min_periods=1).mean()
    normalized['growth_rate'] = normalized['arrivals'].pct_change() * 100
    # Sudden increase: 1 when growth rate exceeds the 75th percentile of training growth rates
    normalized['sudden_increase'] = (
        normalized['growth_rate'] > normalized['growth_rate'].quantile(0.75)
    ).astype(int)

    normalized = normalized.dropna(subset=['arrivals'] + FEATURE_COLUMNS)
    return normalized


def main():
    raw_stdin = '' if sys.stdin.isatty() else sys.stdin.read().strip()
    payload = json.loads(raw_stdin) if raw_stdin else {}

    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
    default_dataset = os.path.join(root_dir, 'db', '2016 - 2025 datasets.csv')
    default_model_dir = os.path.join(root_dir, 'models')

    dataset_path = payload.get('datasetPath') or default_dataset
    payload_rows = payload.get('rows')
    model_path = payload.get('modelPath') or os.path.join(default_model_dir, 'tourism_xgb_model.json')
    metadata_path = payload.get('metadataPath') or os.path.join(default_model_dir, 'tourism_model_metadata.json')
    model_version = payload.get('modelVersion') or f'tourism-xgb-{int(datetime.now(UTC).timestamp())}'
    base_model_name = payload.get('baseModelName') or 'xgboost_base'
    cutoff_year = payload.get('cutoffYear')
    cutoff_month = payload.get('cutoffMonth')

    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    os.makedirs(os.path.dirname(metadata_path), exist_ok=True)

    if payload_rows and isinstance(payload_rows, list):
        raw = pd.DataFrame(payload_rows)
    else:
        raw = pd.read_csv(dataset_path)
    df = normalize_dataset(raw)

    # 80/20 time-based split — no shuffle (time series, matches notebook)
    split_idx = int(len(df) * 0.8)
    X = df[FEATURE_COLUMNS]
    y = df['arrivals']
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    model = xgb.XGBRegressor(
        objective='reg:squarederror',
        **BEST_PARAMS,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(X_train, y_train)
    model.save_model(model_path)

    # Training metrics
    preds_train = model.predict(X_train)
    a_train = y_train.to_numpy()
    mae_train = float(np.abs(preds_train - a_train).mean())
    rmse_train = float(np.sqrt(((preds_train - a_train) ** 2).mean()))
    mape_train = float(np.mean(np.abs((a_train - preds_train) / a_train)) * 100)
    ss_res = float(((a_train - preds_train) ** 2).sum())
    ss_tot = float(((a_train - a_train.mean()) ** 2).sum())
    r2_train = float(1 - (ss_res / ss_tot)) if ss_tot > 0 else 0.0

    # Test metrics (held-out 20%)
    preds_test = model.predict(X_test)
    a_test = y_test.to_numpy()
    mae_test = float(np.abs(preds_test - a_test).mean())
    rmse_test = float(np.sqrt(((preds_test - a_test) ** 2).mean()))
    mape_test = float(np.mean(np.abs((a_test - preds_test) / a_test)) * 100)
    ss_res_t = float(((a_test - preds_test) ** 2).sum())
    ss_tot_t = float(((a_test - a_test.mean()) ** 2).sum())
    r2_test = float(1 - (ss_res_t / ss_tot_t)) if ss_tot_t > 0 else 0.0

    metadata = {
        'modelVersion': model_version,
        'baseModelName': base_model_name,
        'algorithm': 'xgboost',
        'cutoffYear': int(cutoff_year) if cutoff_year is not None else None,
        'cutoffMonth': int(cutoff_month) if cutoff_month is not None else None,
        'trainedAtUtc': datetime.now(UTC).isoformat().replace('+00:00', 'Z'),
        'datasetPath': dataset_path,
        'modelPath': model_path,
        'featureOrder': FEATURE_COLUMNS,
        'target': 'arrivals',
        'hyperparameters': BEST_PARAMS,
        'metrics': {
            'mae_train': mae_train,
            'rmse_train': rmse_train,
            'mape_train': mape_train,
            'r2_train': r2_train,
            'mae_test': mae_test,
            'rmse_test': rmse_test,
            'mape_test': mape_test,
            'r2_test': r2_test,
            'rowCount': int(df.shape[0]),
            'trainCount': int(X_train.shape[0]),
            'testCount': int(X_test.shape[0]),
        },
    }

    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)

    print(json.dumps(metadata))


if __name__ == '__main__':
    main()
