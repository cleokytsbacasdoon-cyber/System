# Tourism Model Integration

This backend can serve forecasts from a trained XGBoost model.

## 1. Install ML dependencies

```bash
cd backend
npm run ml:install
```

## 2. Train and save model locally

```bash
cd backend
npm run ml:train
```

This creates:
- `backend/models/tourism_xgb_model.json`
- `backend/models/tourism_model_metadata.json`

## 3. Start backend

```bash
cd backend
npm run dev
```

## 4. Use model-backed forecasts

`GET /api/forecasts` now tries model-backed forecasting first, then falls back to legacy DB forecasts.

Force legacy mode:

`GET /api/forecasts?source=legacy`

## 5. Check model status

`GET /api/ml/model/status`

## 6. Manually retrain via API

`POST /api/ml/retrain`

Optional JSON body:

```json
{
  "modelVersion": "tourism-xgb-v1",
  "datasetPath": "C:/path/to/dataset.csv",
  "modelPath": "C:/path/to/tourism_xgb_model.json",
  "metadataPath": "C:/path/to/tourism_model_metadata.json"
}
```

## 7. Optional: Use Google Colab endpoint instead of local model

Set environment variables in backend `.env`:

```env
ML_MODEL_SOURCE=colab
ML_COLAB_PREDICT_URL=https://your-colab-endpoint-url/predict
```

Expected Colab endpoint contract:

Request:

```json
{
  "featureOrder": ["year", "month", "peak_season", "philippine_holidays", "top10market_holidays", "avg_hightemp", "avg_lowtemp", "precipitation", "inflation_rate", "is_december", "is_lockdown"],
  "rows": [{"year": 2026, "month": 1, "peak_season": 0, "philippine_holidays": 2, "top10market_holidays": 12, "avg_hightemp": 30.0, "avg_lowtemp": 24.0, "precipitation": 0.2, "inflation_rate": 3.1, "is_december": 0, "is_lockdown": 0}]
}
```

Response:

```json
{
  "predictions": [73422.1]
}
```

## 8. Notebook export tip

If your notebook already has a trained XGBoost model object (for example `model_v3`), add this cell and run it:

```python
import json
from datetime import datetime

feature_order = [
    'year', 'month', 'peak_season', 'philippine_holidays', 'top10market_holidays',
    'avg_hightemp', 'avg_lowtemp', 'precipitation', 'inflation_rate', 'is_december', 'is_lockdown'
]

model_v3.save_model('/content/tourism_xgb_model.json')

metadata = {
    'modelVersion': 'tourism-xgb-notebook-v3',
    'trainedAtUtc': datetime.utcnow().isoformat() + 'Z',
    'featureOrder': feature_order,
    'target': 'arrivals'
}

with open('/content/tourism_model_metadata.json', 'w', encoding='utf-8') as f:
    json.dump(metadata, f, indent=2)
```

Then copy/download both files into `backend/models/`.
