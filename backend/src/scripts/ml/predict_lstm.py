import json
import os
import sys
import warnings

import joblib
import numpy as np
import pandas as pd

# Suppress TF/Keras startup messages
os.environ.setdefault('TF_CPP_MIN_LOG_LEVEL', '3')
os.environ.setdefault('KERAS_BACKEND', 'tensorflow')
warnings.filterwarnings('ignore')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..', 'db'))

N_STEPS = 5  # sequence length the LSTM was trained with

# The 12 input features per timestep (must match training order)
LSTM_FEATURE_COLS = [
    'Top10Market_Holidays',
    'Avg_HighTemp',
    'Avg_LowTemp',
    'Precipitation',
    'Inflation_Rate',
    'is_December',
    'is_Lockdown',
    'Arrivals',
    'lag_1',
    'lag_2',
    'rolling_mean_3m',
    'rolling_mean_6m',
]

MONTH_NAME_TO_NUM = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4,
    'may': 5, 'june': 6, 'july': 7, 'august': 8,
    'september': 9, 'october': 10, 'november': 11, 'december': 12,
}


def month_to_num(month_val):
    """Convert month name or number to integer 1-12."""
    if isinstance(month_val, (int, float)):
        return int(month_val)
    return MONTH_NAME_TO_NUM.get(str(month_val).lower().strip(), 0)


def load_dataset(dataset_path):
    """Load CSV dataset and compute lag/rolling features."""
    df = pd.read_csv(dataset_path)
    df['month_num'] = df['Month'].apply(month_to_num)

    df['lag_1'] = df['Arrivals'].shift(1).bfill()
    df['lag_2'] = df['Arrivals'].shift(2).bfill()
    df['rolling_mean_3m'] = df['Arrivals'].rolling(window=3, min_periods=1).mean()
    df['rolling_mean_6m'] = df['Arrivals'].rolling(window=6, min_periods=1).mean()
    return df


def scale_features(scaler, feature_matrix):
    """
    Scale a (N, 12) feature matrix using the 13-feature MinMaxScaler.
    The scaler was fitted on [12 features | target_arrivals], so we append
    a dummy 13th column of zeros before calling transform and discard it.
    """
    n = feature_matrix.shape[0]
    dummy = np.column_stack([feature_matrix, np.zeros(n)])
    scaled = scaler.transform(dummy)
    return scaled[:, :12]


def inverse_scale_target(scaler, scaled_values):
    """
    Inverse-transform scaled target predictions using the 13th scaler column
    (which corresponds to target arrivals).
    """
    scaled_arr = np.array(scaled_values).ravel()
    dummy = np.zeros((len(scaled_arr), 13))
    dummy[:, 12] = scaled_arr
    return scaler.inverse_transform(dummy)[:, 12]


def predict_one(scaler, model, seq_5x12):
    """Run one LSTM prediction from a (5, 12) sequence. Returns raw arrivals float."""
    scaled = scale_features(scaler, seq_5x12)   # (5, 12)
    X = scaled.reshape(1, N_STEPS, 12)
    pred_scaled = float(model.predict(X, verbose=0)[0, 0])
    arrivals = float(inverse_scale_target(scaler, [pred_scaled])[0])
    return max(0.0, arrivals)


def build_feature_row(top10_holidays, avg_hightemp, avg_lowtemp, precipitation,
                      inflation_rate, is_december, is_lockdown,
                      arrivals, lag1, lag2, rolling3m, rolling6m):
    return np.array([
        float(top10_holidays),
        float(avg_hightemp),
        float(avg_lowtemp),
        float(precipitation),
        float(inflation_rate),
        float(is_december),
        float(is_lockdown),
        float(arrivals),
        float(lag1),
        float(lag2),
        float(rolling3m),
        float(rolling6m),
    ], dtype=np.float64)


def main():
    raw_stdin = '' if sys.stdin.isatty() else sys.stdin.read().strip()
    payload = json.loads(raw_stdin) if raw_stdin else {}

    dataset_path = payload.get(
        'datasetPath', os.path.join(DB_DIR, '2016 - 2025 datasets.csv'))
    future_months = payload.get('futureMonths', [])

    scaler_path = payload.get(
        'scalerPath', os.path.join(DB_DIR, 'lstm_model_extracted', 'scaler.pkl'))
    model_path = payload.get(
        'modelPath', os.path.join(DB_DIR, 'lstm_model_extracted', 'lstm_best_model.keras'))

    # Load model and scaler
    scaler = joblib.load(scaler_path)

    import tensorflow as tf  # noqa: import inside function to keep startup fast
    model = tf.keras.models.load_model(model_path, compile=False)

    # Load and prepare dataset
    df = load_dataset(dataset_path)
    feature_matrix = df[LSTM_FEATURE_COLS].values.astype(np.float64)  # (N, 12)
    total_rows = len(df)

    # ------------------------------------------------------------------ #
    # Historical predictions (for rows where we have a full 5-month window)
    # ------------------------------------------------------------------ #
    historical_predictions = []
    for i in range(total_rows):
        year_val = int(df.iloc[i]['Year'])
        month_num = int(df.iloc[i]['month_num'])
        actual_arrivals = int(df.iloc[i]['Arrivals'])

        if i < N_STEPS:
            # Not enough history for a full sequence — skip
            historical_predictions.append({
                'year': year_val,
                'month_num': month_num,
                'actual': actual_arrivals,
                'predicted': None,
            })
            continue

        seq = feature_matrix[i - N_STEPS:i]   # previous N_STEPS rows
        pred = predict_one(scaler, model, seq)
        historical_predictions.append({
            'year': year_val,
            'month_num': month_num,
            'actual': actual_arrivals,
            'predicted': round(pred),
        })

    # ------------------------------------------------------------------ #
    # Future predictions (autoregressive)
    # ------------------------------------------------------------------ #
    # Seed: last N_STEPS rows from the historical dataset
    rolling_features = list(feature_matrix[-N_STEPS:])   # list of (12,) arrays
    arrivals_history = list(df['Arrivals'].values)         # full history for lag computations

    future_predictions = []

    for frow in future_months:
        # --- Step 1: predict using current rolling window ---
        seq = np.array(rolling_features[-N_STEPS:])   # (5, 12)
        pred = predict_one(scaler, model, seq)
        pred_int = max(0, round(pred))

        future_predictions.append({
            'year': int(frow.get('year', 0)),
            'month': int(frow.get('month', 0)),
            'predicted': pred_int,
        })

        # --- Step 2: build feature row for this predicted month ---
        arrivals_history.append(pred_int)

        lag1 = arrivals_history[-2] if len(arrivals_history) >= 2 else arrivals_history[-1]
        lag2 = arrivals_history[-3] if len(arrivals_history) >= 3 else lag1
        rolling3m = float(np.mean(arrivals_history[-3:])) if len(arrivals_history) >= 3 \
            else float(np.mean(arrivals_history))
        rolling6m = float(np.mean(arrivals_history[-6:])) if len(arrivals_history) >= 6 \
            else float(np.mean(arrivals_history))

        last_feat = rolling_features[-1]
        new_row = build_feature_row(
            top10_holidays=frow.get('top10market_holidays', last_feat[0]),
            avg_hightemp=frow.get('avg_hightemp', last_feat[1]),
            avg_lowtemp=frow.get('avg_lowtemp', last_feat[2]),
            precipitation=frow.get('precipitation', last_feat[3]),
            inflation_rate=frow.get('inflation_rate', last_feat[4]),
            is_december=frow.get('is_december', 0),
            is_lockdown=frow.get('is_lockdown', 0),
            arrivals=pred_int,
            lag1=lag1,
            lag2=lag2,
            rolling3m=rolling3m,
            rolling6m=rolling6m,
        )
        rolling_features.append(new_row)

    print(json.dumps({
        'historical_predictions': historical_predictions,
        'future_predictions': future_predictions,
    }))


if __name__ == '__main__':
    main()
