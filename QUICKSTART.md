# Quick Start Guide — 5 Minute Setup

Get the full system running: PostgreSQL + Backend API + Frontend dashboard.

## Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (must be running)

## Option A: One Command (Recommended)

From the project root:

```bash
docker compose up -d --build
```

This starts everything at once:
- PostgreSQL on `localhost:5432`
- Backend API on `localhost:3000`
- Frontend on `localhost:5173`

Open **http://localhost:5173** — the dashboard loads with live data.

To stop:
```bash
docker compose down
```

---

## Option B: Manual (Step by Step)

**Terminal 1 — Database + Backend:**
```bash
cd backend
npm install
npm run db:up
npm run db:init
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## What You'll See

| Tab | What it shows |
|-----|---------------|
| **Dashboard** | Next-month tourist arrival forecast, monthly trend chart, weather/holiday/inflation parameters |
| **Metrics** | Historical vs. predicted charts (2016–present), Forecasting Model Performance table per model per month |
| **Model Parameters** | Submit monthly arrival data, retrain ML models, Trained Model Logs, API Status |
| **About** | System documentation and feature explanations |

---

## Try These Features

### Dark Mode
Click the moon/sun icon in the header. Your preference is saved automatically.

### Submit Monthly Data
1. Go to **Model Parameters** tab
2. Fill in monthly tourist arrivals, weather, and economic data
3. Click **Submit Data**

### Retrain Models
1. Go to **Model Parameters** tab
2. Select the month and year with actual data
3. Click **Retrain Models**
4. All four models (XGBoost, LSTM, Random Forest, Prophet) are trained and compared
5. The highest-accuracy model is activated automatically

### View Forecast Performance
1. Go to **Metrics** tab
2. Scroll to **Forecasting Model Performance** table
3. See accuracy for each model across all recorded months

---

## Verification Checklist

- [ ] Terminal shows no errors after startup
- [ ] `http://localhost:3000/api/health` returns `{"status":"ok"}`
- [ ] `http://localhost:5173` loads the dashboard
- [ ] Tourist arrival charts show data
- [ ] Model Parameters tab shows trained model entries

---

## Troubleshooting

**Docker not running:**
Open Docker Desktop and wait until the engine fully starts.

**Port 5432 refused:**
```bash
cd backend
npm run db:up
npm run db:init
```

**Frontend shows no data:**
Check `frontend/.env` — it should have:
```env
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://localhost:3000/api
```

**Full reset:**
```bash
cd backend
npm run db:down
npm run db:up
npm run db:init
npm run dev
```

---

For more detail, see [SETUP.md](./SETUP.md).


---

## ⚙️ Configuration

All settings are in the **Settings** page (gear icon):

### Drift Detection
- **Drift Threshold**: How sensitive to changes (1-50%)
- **Auto-resolve**: Clear old alerts automatically
- **Alert Sounds**: Audio notifications on/off

### Dashboard
- **Refresh Interval**: How often data updates (10-300 seconds)

### Data
- **Keep Metrics**: Store 100-5000 historical records

Everything saves to browser storage automatically.

---

## 🔧 Common Tasks

### Change the Refresh Rate
1. Click gear icon (Settings)
2. Adjust "Dashboard Refresh Interval"
3. Save (saves automatically)

### Export All Data
1. Go to **Export** tab
2. Click "Download as CSV" or "Download as JSON"
3. File saves to your Downloads folder

### Reset Everything
1. Settings tab
2. Scroll to bottom
3. Click "Reset to Defaults"

### Use Different Port
If 5173 is taken:
```bash
npm run dev -- --port 5174
```

---

## 🐛 Troubleshooting

**Error: "npm not found"**
→ Install Node.js: https://nodejs.org/

**Port 5173 already in use**
```bash
npm run dev -- --port 5174
```

**Dashboard shows "Loading..." forever**
1. Check if dev server crashed
2. Stop and restart: `npm run dev`
3. Check F12 console for errors

**Styles not loading correctly**
1. Clear browser cache (Ctrl + Shift + Delete)
2. Refresh page (F5)
3. Try incognito/private mode

**npm install fails**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

## 🚀 Using with a Real Backend (Later)

When you're ready to connect a real backend:

1. Create Express API on `http://localhost:3000/api`
2. Edit `frontend/src/services/api.ts`
3. Change this line:
   ```typescript
   const USE_MOCK_API = true;  // Change to false
   ```
4. Restart dev server: `npm run dev`

Your frontend will now use the real backend!

---

## 💡 Tips

✨ **Hot Reload**: Code changes appear instantly in browser
🌙 **Dark Mode**: Preference saved between sessions
💾 **Settings**: All settings stored in browser
📊 **Mock Data**: Sample data resets on page refresh (by design)
🔍 **Development Tools**: Press F12 to open browser developer tools

---

## 📞 Getting Help

1. Check the [Troubleshooting section above](#-troubleshooting)
2. Review [SETUP.md](./SETUP.md) for detailed guidance
3. Check browser console (F12 → Console) for error messages
4. Look at source code comments in `src/` for explanations

---

## ✅ Verification

After `npm run dev`, you should see:

- [ ] Terminal shows "Local: http://localhost:5173/"
- [ ] Browser opens automatically (or visit it manually)
- [ ] Dashboard displays with 6 tabs
- [ ] Sample data visible (metrics, alerts, jobs, endpoints)
- [ ] Dark mode toggle works
- [ ] No loading spinners
- [ ] Charts display data

If all pass, you're ready to go! 🎉

---

**Next**: Explore the dashboard, try the features, read [SETUP.md](./SETUP.md) for details.
