"""
train_lstm.py — Retrain the LSTM model on new/expanded data.

Input  (stdin JSON):
  rows          – list of training payload rows (same format as toTrainingPayloadRow)
  modelPath     – where to save the updated .keras model  (default: db/lstm_model_extracted/)
  scalerPath    – where to save the updated scaler.pkl    (default: db/lstm_model_extracted/)
  cutoffYear    – for metadata only
  cutoffMonth   – for metadata only

Output (stdout JSON):
  modelVersion, algorithm, metrics { mape_train, mape_test, mae_train, rmse_train, r2_train, … }
"""
import json
import os
import sys
import warnings
from datetime import datetime, UTC

import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

os.environ.setdefault('TF_CPP_MIN_LOG_LEVEL', '3')
os.environ.setdefault('KERAS_BACKEND', 'tensorflow')
warnings.filterwarnings('ignore')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..', 'db'))

LSTM_EXTRACTED_DIR = os.path.join(DB_DIR, 'lstm_model_extracted')
DEFAULT_MODEL_PATH = os.path.join(LSTM_EXTRACTED_DIR, 'lstm_best_model.keras')
DEFAULT_SCALER_PATH = os.path.join(LSTM_EXTRACTED_DIR, 'scaler.pkl')
BEST_PARAMS_PATH = os.path.join(LSTM_EXTRACTED_DIR, 'best_params.json')

N_STEPS = 5  # sequence length the LSTM was trained with

# The 12 input features per timestep — must match predict_lstm.py
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
    """Convert payload rows to DataFrame with LSTM feature columns."""
    df = pd.DataFrame(rows)
    df['month_num'] = df['Month'].apply(month_to_num)
    df = df.sort_values(['Year', 'month_num']).reset_index(drop=True)

    df['Arrivals'] = pd.to_numeric(df['Arrivals'], errors='coerce').fillna(0)
    df['lag_1'] = df['Arrivals'].shift(1).bfill()
    df['lag_2'] = df['Arrivals'].shift(2).bfill()
    df['rolling_mean_3m'] = df['Arrivals'].rolling(window=3, min_periods=1).mean()
    df['rolling_mean_6m'] = df['Arrivals'].rolling(window=6, min_periods=1).mean()

    for col in LSTM_FEATURE_COLS:
        if col not in df.columns:
            df[col] = 0.0
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    return df


def build_sequences(scaled_X, scaled_y, n_steps):
    X_seqs, y_seqs = [], []
    for i in range(n_steps, len(scaled_X)):
        X_seqs.append(scaled_X[i - n_steps:i])
        y_seqs.append(scaled_y[i])
    return np.array(X_seqs), np.array(y_seqs)


def build_model(best_params):
    import tensorflow as tf  # noqa: import here to avoid slow startup

    units1 = int(best_params.get('units1', 64))
    units2 = int(best_params.get('units2', 8))
    dropout = float(best_params.get('dropout', 0.2))
    lr = float(best_params.get('learning_rate', 0.001))
    use_bidirectional = bool(best_params.get('bidirectional', True))

    inp = tf.keras.Input(shape=(N_STEPS, len(LSTM_FEATURE_COLS)))

    if use_bidirectional:
        x = tf.keras.layers.Bidirectional(
            tf.keras.layers.LSTM(units1, return_sequences=True)
        )(inp)
    else:
        x = tf.keras.layers.LSTM(units1, return_sequences=True)(inp)

    x = tf.keras.layers.Dropout(dropout)(x)
    x = tf.keras.layers.LSTM(units2)(x)
    x = tf.keras.layers.Dropout(dropout)(x)
    out = tf.keras.layers.Dense(1)(x)

    model = tf.keras.Model(inputs=inp, outputs=out)
    model.compile(optimizer=tf.keras.optimizers.Adam(lr), loss='mse')
    return model


def inv_scale_target(scaler, scaled_vals):
    """Inverse-transform scaled target values (column 12 in the 13-feature scaler)."""
    arr = np.array(scaled_vals).ravel()
    dummy = np.zeros((len(arr), 13))
    dummy[:, 12] = arr
    return scaler.inverse_transform(dummy)[:, 12]


def compute_mape(actual, predicted):
    mask = actual > 0
    if mask.sum() == 0:
        return 100.0
    return float(np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100)


def main():
    raw_stdin = '' if sys.stdin.isatty() else sys.stdin.read().strip()
    payload = json.loads(raw_stdin) if raw_stdin else {}

    payload_rows = payload.get('rows')
    model_path = payload.get('modelPath') or DEFAULT_MODEL_PATH
    scaler_path = payload.get('scalerPath') or DEFAULT_SCALER_PATH
    cutoff_year = payload.get('cutoffYear')
    cutoff_month = payload.get('cutoffMonth')

    if not payload_rows or not isinstance(payload_rows, list):
        print(json.dumps({'error': 'No rows provided'}), flush=True)
        sys.exit(1)

    # Ensure output directory exists
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    os.makedirs(os.path.dirname(scaler_path), exist_ok=True)

    df = prepare_dataframe(payload_rows)

    if len(df) < N_STEPS + 2:
        print(json.dumps({'error': f'Not enough rows to train LSTM (need >{N_STEPS+2}, got {len(df)})'}), flush=True)
        sys.exit(1)

    # Load best hyperparams
    best_params = {'units1': 64, 'units2': 8, 'dropout': 0.2, 'learning_rate': 0.00049, 'bidirectional': True, 'epochs': 30, 'batch_size': 20}
    if os.path.isfile(BEST_PARAMS_PATH):
        with open(BEST_PARAMS_PATH, 'r') as f:
            best_params.update(json.load(f))

    epochs = int(best_params.get('epochs', 30))
    batch_size = int(best_params.get('batch_size', 20))

    # Build feature matrix (N, 12) and arrivals array (N,)
    feature_matrix = df[LSTM_FEATURE_COLS].values.astype(np.float64)
    arrivals = df['Arrivals'].values.astype(np.float64)

    # Fit scaler on all 13 columns [12 features | arrivals]
    full_matrix = np.column_stack([feature_matrix, arrivals])
    scaler = MinMaxScaler()
    scaler.fit(full_matrix)

    # Scale
    scaled_full = scaler.transform(full_matrix)
    scaled_X_all = scaled_full[:, :12]
    scaled_y_all = scaled_full[:, 12]

    # Build sequences
    X_seq, y_seq = build_sequences(scaled_X_all, scaled_y_all, N_STEPS)

    if len(X_seq) < 4:
        print(json.dumps({'error': 'Not enough sequences to train'}), flush=True)
        sys.exit(1)

    # 80/20 time-based split
    split = max(1, int(len(X_seq) * 0.8))
    X_train, X_test = X_seq[:split], X_seq[split:]
    y_train, y_test = y_seq[:split], y_seq[split:]

    # Build and train model from scratch using best_params
    model = build_model(best_params)
    model.fit(
        X_train, y_train,
        epochs=epochs,
        batch_size=batch_size,
        verbose=0,
        validation_data=(X_test, y_test) if len(X_test) > 0 else None,
    )

    # --- Metrics ---
    preds_train_scaled = model.predict(X_train, verbose=0).ravel()
    actual_train = inv_scale_target(scaler, y_train)
    preds_train = np.maximum(0, inv_scale_target(scaler, preds_train_scaled))

    mape_train = compute_mape(actual_train, preds_train)
    mae_train = float(np.abs(preds_train - actual_train).mean())
    rmse_train = float(np.sqrt(((preds_train - actual_train) ** 2).mean()))
    ss_res = float(((actual_train - preds_train) ** 2).sum())
    ss_tot = float(((actual_train - actual_train.mean()) ** 2).sum())
    r2_train = float(1 - ss_res / ss_tot) if ss_tot > 0 else 0.0

    mape_test, mae_test, rmse_test, r2_test = mape_train, mae_train, rmse_train, r2_train
    if len(X_test) > 0:
        preds_test_scaled = model.predict(X_test, verbose=0).ravel()
        actual_test = inv_scale_target(scaler, y_test)
        preds_test = np.maximum(0, inv_scale_target(scaler, preds_test_scaled))
        mape_test = compute_mape(actual_test, preds_test)
        mae_test = float(np.abs(preds_test - actual_test).mean())
        rmse_test = float(np.sqrt(((preds_test - actual_test) ** 2).mean()))
        ss_res_t = float(((actual_test - preds_test) ** 2).sum())
        ss_tot_t = float(((actual_test - actual_test.mean()) ** 2).sum())
        r2_test = float(1 - ss_res_t / ss_tot_t) if ss_tot_t > 0 else 0.0

    # --- Save model and scaler ---
    model.save(model_path)
    joblib.dump(scaler, scaler_path)

    result = {
        'modelVersion': f'lstm_{cutoff_year}_{cutoff_month}',
        'algorithm': 'lstm',
        'cutoffYear': cutoff_year,
        'cutoffMonth': cutoff_month,
        'trainedAtUtc': datetime.now(UTC).isoformat().replace('+00:00', 'Z'),
        'modelPath': model_path,
        'scalerPath': scaler_path,
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
