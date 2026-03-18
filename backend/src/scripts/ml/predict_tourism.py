import json
import sys

import pandas as pd
import xgboost as xgb


def main():
    raw_stdin = '' if sys.stdin.isatty() else sys.stdin.read().strip()
    payload = json.loads(raw_stdin) if raw_stdin else {}
    model_path = payload.get('modelPath')
    rows = payload.get('rows', [])
    feature_order = payload.get('featureOrder', [])

    if not model_path:
        raise ValueError('modelPath is required')

    if not feature_order:
        raise ValueError('featureOrder is required')

    model = xgb.XGBRegressor()
    model.load_model(model_path)

    if not rows:
        print(json.dumps({'predictions': []}))
        return

    frame = pd.DataFrame(rows)
    frame = frame[feature_order]

    predictions = model.predict(frame)
    result = [float(value) for value in predictions]

    print(json.dumps({'predictions': result}))


if __name__ == '__main__':
    main()
