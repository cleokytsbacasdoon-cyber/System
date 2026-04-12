import json
import os
import sys
import warnings
import zipfile

import pandas as pd

warnings.filterwarnings('ignore')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..', 'db'))

MONTH_NAME_TO_NUM = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4,
    'may': 5, 'june': 6, 'july': 7, 'august': 8,
    'september': 9, 'october': 10, 'november': 11, 'december': 12,
}


def month_to_num(val):
    if isinstance(val, (int, float)):
        return int(val)
    return MONTH_NAME_TO_NUM.get(str(val).lower().strip(), 0)


def load_prophet_model(zip_path):
    """
    Load Prophet model from zip.  The JSON file is double-encoded
    (a JSON string containing another JSON string) — model_from_json
    expects the inner string.
    """
    from prophet.serialize import model_from_json  # noqa: import kept lazy

    with zipfile.ZipFile(zip_path) as zf:
        raw = zf.read('prophet_best_model.json').decode('utf-8')

    # Outer json.loads gives the inner JSON string
    model_json_str = json.loads(raw)
    m = model_from_json(model_json_str)
    # Disable uncertainty sampling so Stan/cmdstan is never invoked at predict time
    m.uncertainty_samples = 0
    return m


def load_dataset(dataset_path):
    df = pd.read_csv(dataset_path)
    df['Month_Num'] = df['Month'].apply(month_to_num)
    df['ds'] = pd.to_datetime(
        df['Year'].astype(str) + '-' + df['Month_Num'].astype(str).str.zfill(2) + '-01'
    )
    return df


def main():
    raw_stdin = '' if sys.stdin.isatty() else sys.stdin.read().strip()
    payload = json.loads(raw_stdin) if raw_stdin else {}

    dataset_path = payload.get('datasetPath', os.path.join(DB_DIR, '2016 - 2025 datasets.csv'))
    zip_path = payload.get('zipPath', os.path.join(DB_DIR, 'prophet_model.zip'))
    future_months = payload.get('futureMonths', [])

    m = load_prophet_model(zip_path)
    df = load_dataset(dataset_path)

    # --- Historical retrodict ---
    hist_ds_df = df[['ds']].copy()
    hist_pred = m.predict(hist_ds_df)

    # Build a lookup: ds → yhat
    hist_lookup = dict(zip(hist_pred['ds'].dt.to_pydatetime(), hist_pred['yhat']))

    historical_predictions = []
    for _, row in df.iterrows():
        yhat = hist_lookup.get(row['ds'].to_pydatetime(), 0.0)
        historical_predictions.append({
            'year': int(row['Year']),
            'month_num': int(row['Month_Num']),
            'actual': int(row['Arrivals']),
            'predicted': round(max(0.0, float(yhat))),
        })

    # --- Future predictions ---
    future_predictions = []
    if future_months:
        future_dates = [
            pd.Timestamp(year=int(fm['year']), month=int(fm['month']), day=1)
            for fm in future_months
        ]
        future_df = pd.DataFrame({'ds': future_dates})
        future_pred = m.predict(future_df)

        for i, fm in enumerate(future_months):
            yhat = float(future_pred.iloc[i]['yhat'])
            future_predictions.append({
                'year': int(fm['year']),
                'month': int(fm['month']),
                'predicted': round(max(0.0, yhat)),
            })

    print(json.dumps({
        'historical_predictions': historical_predictions,
        'future_predictions': future_predictions,
    }))


if __name__ == '__main__':
    main()
