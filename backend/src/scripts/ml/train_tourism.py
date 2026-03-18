import json
import os
import sys
from datetime import datetime, UTC

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

FEATURE_COLUMNS = [
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
]


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

    normalized = normalized.dropna(subset=['arrivals'] + FEATURE_COLUMNS)
    return normalized


def main():
    raw_stdin = '' if sys.stdin.isatty() else sys.stdin.read().strip()
    payload = json.loads(raw_stdin) if raw_stdin else {}

    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
    default_dataset = os.path.join(root_dir, 'db', 'dataset.csv')
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

    X = df[FEATURE_COLUMNS]
    y = df['arrivals']

    model = xgb.XGBRegressor(
        objective='reg:squarederror',
        n_estimators=400,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(X, y)
    model.save_model(model_path)

    preds = model.predict(X)
    actual = y.to_numpy()
    mae = float((abs(preds - y)).mean())
    rmse = float((((preds - y) ** 2).mean()) ** 0.5)
    mape = float((abs((actual - preds) / actual)).mean() * 100)
    ss_res = float(((actual - preds) ** 2).sum())
    ss_tot = float(((actual - actual.mean()) ** 2).sum())
    r2 = float(1 - (ss_res / ss_tot)) if ss_tot > 0 else 0.0

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
        'metrics': {
            'mae_train': mae,
            'rmse_train': rmse,
            'mape_train': mape,
            'r2_train': r2,
            'rowCount': int(df.shape[0]),
        },
    }

    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)

    print(json.dumps(metadata))


if __name__ == '__main__':
    main()
