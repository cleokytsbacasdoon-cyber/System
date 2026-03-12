# Quick Start Guide - 5 Minute Setup

This guide gets you running with the ML Monitoring Dashboard **without any backend setup** using mock data.

## 🚀 TL;DR - Get Running in 5 Minutes

### Prerequisites
- Node.js 16+ ([Download](https://nodejs.org/))

That's it! No PostgreSQL, no backend server, nothing else needed.

### 1. Install & Run

```bash
cd frontend
npm install
npm run dev
```

### 2. Open Dashboard

**Click the link or go to**: http://localhost:5173

You'll see the complete ML Monitoring Dashboard with sample data! ✅

---

## 📊 What You'll See

The dashboard shows real-time ML model monitoring with **sample data**:

1. **Overview Tab** - Quick statistics and key metrics
2. **Metrics Tab** - Charts showing accuracy trends
3. **Alerts Tab** - Drift detection alerts (you can resolve them)
4. **Retraining Tab** - Auto-retraining job tracking
5. **API Tab** - API endpoint health monitoring
6. **Export Tab** - Export data as CSV or JSON

## 🎯 Try These Features

### 1. Dark Mode
- Click the moon icon (top-right)
- Your preference is saved automatically

### 2. Resolve an Alert
- Go to **Alerts** tab
- Click the X button on a drift alert
- It disappears immediately

### 3. Start a Retraining Job
- Go to **Retraining** tab
- Click "Start New Job"
- Watch the job status change: pending → running → completed

### 4. View Charts
- Go to **Metrics** tab
- See interactive charts of model performance
- Charts update automatically every 30 seconds

### 5. Export Data
- Go to **Export** tab
- Download metrics as CSV or JSON
- All your sample data in useful formats

### 6. Change Settings
- Click the gear icon (top-right)
- Adjust drift thresholds, refresh rates, etc.
- Settings save automatically

---

## 📝 Sample Data Features

The mock API generates and updates:

- **10 Historical Metrics** - Accuracy, precision, recall trends
- **2 Drift Alerts** - Some active, some resolved
- **3 Retraining Jobs** - Different statuses (pending, running, completed)
- **3 API Endpoints** - Some active, some inactive
- **Real-time Updates** - New metrics added every 30 seconds
- **Network Simulation** - Realistic 200-1000ms API delays

Everything updates automatically. Watch it change in real-time!

---

## 🔄 Real-time Updates

The dashboard auto-refreshes every 30 seconds with new sample data:

- New metrics are generated
- Job statuses advance (pending → running → completed)
- Drift alert patterns change
- All updates are realistic and simulated

No backend server needed!

---

## 📚 Full Documentation

For more details, see:

- **[Complete Setup Guide](./SETUP.md)** - Detailed installation and troubleshooting
- **[Frontend Features](./frontend/FEATURES.md)** - All components (50+ pages)
- **[Performance Tips](./frontend/PERFORMANCE.md)** - Optimization details
- **[Main README](./README.md)** - Architecture overview

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
