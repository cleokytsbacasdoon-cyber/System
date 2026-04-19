# Setup Guide — Panglao Tourist Accommodation Demand Forecasting System

This guide covers full installation of the system: PostgreSQL (Docker), Backend API (Node.js), and Frontend (React + Vite).

---

## System Requirements

| Component | Requirement |
|-----------|-------------|
| OS | Windows, macOS, or Linux |
| Node.js | 18 or higher |
| npm | 9 or higher (comes with Node.js) |
| Docker Desktop | Latest stable |
| RAM | 4GB minimum |
| Disk Space | 1GB |

---

## Step 1: Verify Prerequisites

```bash
node --version    # v18.0.0 or higher
npm --version     # 9.0.0 or higher
docker --version  # Docker Desktop must be running
```

---

## Step 2: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (separate terminal)
cd frontend
npm install
```

---

## Step 3: Start the System

### Option A — One Command (Recommended)

```bash
docker compose up -d --build
```

Starts PostgreSQL, Backend API, and Frontend all at once.

### Option B — Manual

**Terminal 1:**
```bash
cd backend
npm run db:up
npm run db:init
npm run dev
```

**Terminal 2:**
```bash
cd frontend
npm run dev
```

---

## Step 4: Verify Everything is Running

| Service | URL | Expected Response |
|---------|-----|-------------------|
| PostgreSQL | `localhost:5432` | Port open |
| Backend API | `http://localhost:3000/api/health` | `{"status":"ok"}` |
| Frontend | `http://localhost:5173` | Dashboard loads |

```powershell
# Windows: check PostgreSQL port
Test-NetConnection localhost -Port 5432
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ml_monitoring
DB_USER=postgres
DB_PASSWORD=postgres
```

### Frontend (`frontend/.env`)

```env
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://localhost:3000/api
```

---

## Project Structure

```
System-Thesis/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express API, ML pipeline, cron scheduler
│   │   └── ml/
│   │       └── tourismModelService.js  # XGBoost, LSTM, RF, Prophet forecast builders
│   ├── models/
│   │   ├── tourism_xgb_model.json  # Seed XGBoost model (tracked in git)
│   │   ├── tourism_model_metadata.json  # Seed model metadata (tracked in git)
│   │   └── *.json                 # Retrained models (git-ignored, stored locally)
│   ├── db/
│   │   ├── init.sql               # DB schema + seed data
│   │   ├── 2016 - 2025 datasets.csv  # Historical tourism data
│   │   └── Top10MH.csv            # Top 10 market holiday data
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/Dashboard.tsx    # 4-tab main interface
│   │   ├── components/            # Charts, tables, cards
│   │   ├── services/api.ts        # API layer
│   │   ├── contexts/              # DarkMode, Toast providers
│   │   └── types/index.ts         # TypeScript interfaces
│   └── package.json
├── docker-compose.yml
├── README.md
├── SETUP.md
└── QUICKSTART.md
```

---

## Dashboard Tabs

| Tab | Description |
|-----|-------------|
| **Dashboard** | Next-month forecast, tourist trend chart, weather/holiday/inflation parameters |
| **Metrics** | Monthly tourist arrivals chart (2016–present), Forecasting Model Performance table |
| **Model Parameters** | Submit monthly data, trigger retraining, Trained Model Logs, API Status |
| **About** | System documentation, retraining feature explanation, external data sources |

---

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `monthly_tourism_dataset` | Historical + current tourist arrival data with features |
| `model_versions` | All trained model records with accuracy and status |
| `saved_predictions` | Per-model monthly predictions from retraining |
| `retraining_jobs` | Retraining run history |
| `demand_alerts` | Drift/anomaly alerts |

---

## How to View the Database

### DBeaver / pgAdmin

- Host: `localhost`, Port: `5432`
- Database: `ml_monitoring`
- Username: `postgres`, Password: `postgres`

### psql in container

```bash
docker exec -it ml-monitoring-postgres psql -U postgres -d ml_monitoring
```

Useful queries:
```sql
\dt
SELECT COUNT(*) FROM monthly_tourism_dataset;
SELECT * FROM model_versions ORDER BY created_at DESC LIMIT 10;
SELECT * FROM saved_predictions ORDER BY predicted_year, predicted_month;
\q
```

---

## Development Commands

### Backend

```bash
npm run db:up      # Start PostgreSQL container
npm run db:down    # Stop PostgreSQL container
npm run db:init    # Create/seed all tables
npm run dev        # Start API server with hot reload
npm start          # Start API server (no watch)
```

### Frontend

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm test           # Run unit tests
npm run type-check # TypeScript type check
npm run lint       # Lint check
```

---

## Troubleshooting

### `Connection refused` on port 5432
```bash
cd backend
npm run db:up
npm run db:init
```

### `dockerDesktopLinuxEngine` error
Open Docker Desktop and wait until the engine fully starts.

### Frontend loads but no data
1. Confirm backend is running (`http://localhost:3000/api/health`)
2. Check `frontend/.env` has `VITE_USE_MOCK_API=false`
3. Re-run `npm run db:init`

### No model / forecast errors
Ensure `backend/models/tourism_xgb_model.json` exists. This seed model is tracked in git. If missing, restore via:
```bash
git checkout HEAD -- backend/models/tourism_xgb_model.json
git checkout HEAD -- backend/models/tourism_model_metadata.json
```

### npm install fails
```bash
npm cache clean --force
rd /s /q node_modules
npm install
```

---

## Full Recovery Sequence

```bash
cd backend
npm run db:down
npm run db:up
npm run db:init
npm run dev
```

Then in a second terminal:
```bash
cd frontend
npm run dev
```

---

## Architecture

```
Browser
  ↓
Frontend (React + TypeScript + Vite)
  ↓  api.ts (VITE_USE_MOCK_API=false)
Backend (Express.js, Node.js)
  ↓               ↓
PostgreSQL     Python ML scripts
(ml_monitoring)  (XGBoost, LSTM, RF, Prophet)
```

External data sources fetched at runtime:
- Open-Meteo API — weather (temperature, precipitation)
- Calendarific API — Philippine + top market holidays
- Inflation rate — stored in monthly_tourism_dataset
