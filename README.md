# System Thesis - Full Setup and Run Guide

This guide explains how to properly initialize and run the whole system:
- PostgreSQL database (Docker)
- Backend API (Express)
- Frontend dashboard (React + Vite)

## 1. Prerequisites

Install these first:
- Node.js 18+
- npm
- Docker Desktop (must be running)
- Optional SQL client: DBeaver or pgAdmin

## 2. Project Structure

- `backend/` - Express API + PostgreSQL initialization scripts
- `frontend/` - React dashboard
- `backend/db/init.sql` - schema + seed data
- `backend/db/dataset.csv` - monthly tourism dataset file

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

### 3.1 Start PostgreSQL (Docker)

```bash
cd backend
npm run db:up
```

Expected result: Docker container `ml-monitoring-postgres` is running on `localhost:5432`.

### 3.2 Initialize database tables and seed data

```bash
npm run db:init
```

Expected result:
- Tables are created in database `ml_monitoring`
- Seed records are inserted from `backend/db/init.sql`

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
