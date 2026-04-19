# Panglao Tourist Accommodation Demand Forecasting System

An ML-powered demand forecasting and monitoring system for tourist accommodations in Panglao, Bohol. It uses multiple machine learning models (XGBoost, LSTM, Random Forest, Prophet) with automated monthly retraining and real-time external data integration.

## System Components

- **PostgreSQL** (Docker) — stores tourism data, model versions, predictions
- **Backend API** (Node.js + Express) — ML model serving, retraining pipeline, external API integration
- **Frontend** (React + TypeScript + Vite) — monitoring dashboard with 3 tabs: Dashboard, Metrics, Model Parameters

## 1. Prerequisites

Install these first:
- Node.js 18+
- npm
- Docker Desktop (must be running)
- Optional SQL client: DBeaver or pgAdmin

## 2. Project Structure

```
System-Thesis/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express API, ML retraining pipeline, cron scheduler
│   │   └── ml/
│   │       └── tourismModelService.js  # XGBoost, LSTM, RF, Prophet forecast builders
│   ├── models/                    # Seed models (tourism_xgb_model.json) + retrained models (git-ignored)
│   ├── db/
│   │   ├── init.sql               # DB schema + seed data
│   │   ├── 2016 - 2025 datasets.csv  # Historical tourism dataset
│   │   └── Top10MH.csv            # Top 10 market holiday data
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/Dashboard.tsx    # Main 3-tab interface
│   │   ├── components/            # Charts, tables, cards
│   │   ├── services/api.ts        # API layer
│   │   └── types/index.ts         # TypeScript interfaces
│   └── package.json
├── docker-compose.yml             # Root compose (starts all services)
├── README.md                      # This file
├── SETUP.md                       # Detailed setup guide
└── QUICKSTART.md                  # 5-minute quick start

## 3. First-Time Setup

### 3.0 One-command Docker startup (recommended)

From project root, run:

```bash
docker compose up -d --build
```

This starts:
- PostgreSQL on `localhost:5432`
- Backend API on `localhost:3000`
- Frontend app on `localhost:5173`

To stop everything:

```bash
docker compose down
```

### 3.1 Start PostgreSQL (Docker) manually

```bash
cd backend
npm run db:up
```

Expected result: Docker container `ml-monitoring-postgres` is running on `localhost:5432`.

### 3.2 Initialize database

```bash
npm run db:init
```

Creates all tables (including `monthly_tourism_dataset`, `model_versions`, `saved_predictions`, `retraining_jobs`) and seeds historical data from `backend/db/init.sql`.

### 3.3 Start backend API

```bash
npm run dev
```

Backend base URL:
- `http://localhost:3000`
- Health check: `http://localhost:3000/api/health`

### 3.4 Start frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:
- `http://localhost:5173`

## 4. Environment Variables

### Backend (`backend/.env`)

Copy from `.env.example` and set values:

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

## 5. Daily Startup Order

1. Start Docker Desktop
2. `cd backend && npm run db:up`
3. `cd backend && npm run dev`
4. `cd frontend && npm run dev`

## 6. Dashboard Tabs

| Tab | Description |
|-----|-------------|
| **Dashboard** | Next-month forecast, tourist trend charts, weather/holiday/inflation parameters |
| **Metrics** | Historical vs. predicted arrival charts (2016–present), Forecasting Model Performance table |
| **Model Parameters** | Submit monthly data, trigger retraining, view Trained Model Logs, API Status |
| **About** | System documentation, feature explanations, how-to guide |

## 7. How to View the Database

### Option A: DBeaver / pgAdmin

- Host: `localhost`, Port: `5432`, DB: `ml_monitoring`, User: `postgres`, Password: `postgres`

### Option B: psql in container

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

## 8. Quick Verification Checklist

1. `Test-NetConnection localhost -Port 5432` → `TcpTestSucceeded : True`
2. `http://localhost:3000/api/health` → returns `{"status":"ok",...}`
3. `http://localhost:5173` → dashboard loads without errors

## 9. Common Problems and Fixes

### Problem: `Connection refused` on `localhost:5432`

```bash
cd backend
npm run db:up
npm run db:init
```

### Problem: `failed to connect to dockerDesktopLinuxEngine`

Open Docker Desktop and wait until the engine is fully started, then retry.

### Problem: Frontend loads but data is missing

1. Confirm backend is running on port `3000`
2. Check `frontend/.env` has `VITE_USE_MOCK_API=false` and `VITE_API_BASE_URL=http://localhost:3000/api`
3. Run `npm run db:init` again

### Problem: No model available / forecast errors

The seed model `backend/models/tourism_xgb_model.json` must exist. It is tracked in git. If missing, re-clone the repository or restore it from git history.

## 10. Useful Commands

### Backend

```bash
cd backend
npm run db:up      # start postgres container
npm run db:down    # stop postgres container
npm run db:init    # create/seed database
npm run dev        # start API server (with watch)
npm start          # start API server (no watch)
```

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run build
npm run type-check
npm test
```

## 11. Recovery Sequence

If anything breaks, start fresh:

```bash
cd backend
npm run db:down
npm run db:up
npm run db:init
npm run dev
```

Then in another terminal:

```bash
cd frontend
npm run dev
```

Frontend URL:
- `http://localhost:5173`

## 4. Environment Variables

### Backend (`backend/.env`)

Copy from `.env.example` and set values:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ml_monitoring
DB_USER=postgres
DB_PASSWORD=postgres
```

### Frontend (`frontend/.env`)

Copy from `.env.example` and set values:

```env
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://localhost:3000/api
```

Important:
- `VITE_USE_MOCK_API=false` means frontend uses the real backend/database.
- Set `VITE_USE_MOCK_API=true` only if you want local mock data.

## 5. Daily Startup Order

Use this order every time:

1. Start Docker Desktop
2. `cd backend && npm run db:up`
3. `cd backend && npm run dev`
4. `cd frontend && npm run dev`

If database was reset or changed, run `npm run db:init` again.

## 6. How to View Database Tables

### Option A: DBeaver / pgAdmin

Connection settings:
- Host: `localhost`
- Port: `5432`
- Database: `ml_monitoring`
- Username: `postgres`
- Password: `postgres`

In DBeaver:
1. Open connection `ml_monitoring`
2. Expand `Schemas`
3. Expand `public`
4. Open `Tables`
5. Double-click a table and open `Data`

### Option B: psql in container

```bash
docker exec -it ml-monitoring-postgres psql -U postgres -d ml_monitoring
```

Useful commands:

```sql
\dt
SELECT COUNT(*) FROM monthly_tourism_dataset;
SELECT * FROM monthly_tourism_dataset ORDER BY year, month LIMIT 20;
\q
```

## 7. Quick Verification Checklist

Run these checks after startup:

1. Database reachable:
```powershell
Test-NetConnection localhost -Port 5432
```
Expect `TcpTestSucceeded : True`.

2. Backend healthy:
- Open `http://localhost:3000/api/health`
- Should return status JSON

3. Frontend loaded:
- Open `http://localhost:5173`
- Dashboard renders without API errors

## 8. Common Problems and Fixes

### Problem: `Connection refused` on `localhost:5432`

Cause: PostgreSQL container is not running.

Fix:
1. Start Docker Desktop
2. Run:
```bash
cd backend
npm run db:up
npm run db:init
```

### Problem: `failed to connect to dockerDesktopLinuxEngine`

Cause: Docker Desktop engine is not running.

Fix:
1. Open Docker Desktop app
2. Wait until engine is fully started
3. Re-run `npm run db:up`

### Problem: Frontend loads but data missing

Check:
1. Backend running on `3000`
2. Frontend env has:
   - `VITE_USE_MOCK_API=false`
   - `VITE_API_BASE_URL=http://localhost:3000/api`
3. Run `npm run db:init` again

### Problem: SQL client connects but no tables visible

Fix:
1. Confirm database name is exactly `ml_monitoring`
2. Refresh `Schemas > public > Tables`
3. Re-run `npm run db:init`

## 9. Useful Commands

### Backend

```bash
cd backend
npm run db:up      # start postgres container
npm run db:down    # stop postgres container
npm run db:init    # create/seed database
npm run dev        # start API server
npm start          # start API server (non-watch)
```

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run build
npm run type-check
npm test
```

## 10. Recommended Workflow for Development

1. Keep backend and frontend in separate terminals
2. Keep Docker Desktop open while working
3. Re-run `npm run db:init` after schema/seed updates
4. Use SQL client to inspect records while testing dashboard behavior

---

If anything breaks again, start from this clean recovery sequence:

```bash
cd backend
npm run db:down
npm run db:up
npm run db:init
npm run dev
```

Then in another terminal:

```bash
cd frontend
npm run dev
```
