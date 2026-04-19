# Panglao Tourist Accommodation Demand Forecasting System - Frontend

React + TypeScript dashboard for monitoring, forecasting, and managing ML models.

## Features

- 4-tab dashboard: Dashboard, Metrics, Model Parameters, About
- Monthly tourist arrival forecasts using XGBoost, LSTM, RF, Prophet
- Historical vs. predicted charts (2016-present)
- Forecasting Model Performance table per model per month
- Monthly data submission form
- Manual and auto retraining trigger
- Trained Model Logs with Manual/Auto badge
- API Status monitoring (Open-Meteo, Calendarific)
- Dark/light mode with localStorage persistence
- Toast notifications

## Tech Stack

- React 18, TypeScript, Vite
- Tailwind CSS
- Chart.js (react-chartjs-2)
- Vitest for testing

## Project Structure

```
frontend/
├── src/
│   ├── pages/
│   │   └── Dashboard.tsx          # Main 4-tab interface
│   ├── components/
│   │   ├── MonthlyTouristArrivalsDataChart.tsx  # Historical/actual vs predicted chart
│   │   ├── TouristForecastTrendChart.tsx        # Future trend forecast chart
│   │   ├── TouristParametersBarChart.tsx        # Weather/holiday/inflation bar chart
│   │   ├── APIEndpointCard.tsx
│   │   ├── DriftAlertCard.tsx
│   │   ├── RetrainingJobCard.tsx
│   │   ├── DataQualityDashboard.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── LoadingSkeleton.tsx
│   │   └── ToastContainer.tsx
│   ├── contexts/
│   │   ├── DarkModeContext.tsx
│   │   └── ToastContext.tsx
│   ├── services/
│   │   └── api.ts                 # API layer (real backend)
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces
│   └── utils/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── vitest.config.ts
```

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173

Requires backend running on http://localhost:3000 and `frontend/.env`:
```env
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://localhost:3000/api
```

## Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm test           # Run unit tests
npm run type-check # TypeScript check
npm run lint       # Lint check
```

## Dashboard Tabs

| Tab | Content |
|-----|---------|
| Dashboard | Next-month forecast card, TouristForecastTrendChart, MonthlyTouristArrivalsDataChart, parameter cards |
| Metrics | MonthlyTouristArrivalsDataChart (all years + single year), Forecasting Model Performance table |
| Model Parameters | Monthly data form, Retrain Models button, Trained Model Logs table, API Status table |
| About | System documentation and how-to guide |

## Chart Behaviour

**MonthlyTouristArrivalsDataChart:**
- Year = 0 (All Years): Shows 2016-2025 with 80/20 train-test split overlay and orange dashed predicted line over test set
- Year = 2016-2023: Actual arrivals only (training period — no predicted line shown)
- Year = 2024+: Both actual and predicted lines shown (test set and beyond)

**TouristForecastTrendChart:**
- Shows last 3 actual months + up to 12 months ahead forecast
- Horizon selector: 3, 6, or 12 months
