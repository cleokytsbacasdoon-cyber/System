# Setup Guide - ML Monitoring System (Frontend Only)

This guide will help you set up and run the ML Monitoring System dashboard. The frontend includes a mock API service, so you can start using it immediately without backend infrastructure.

---

## 📋 Prerequisites

### System Requirements
| Component | Requirement |
|-----------|-------------|
| OS | Windows, macOS, or Linux |
| Node.js | 16 or higher |
| npm | 8 or higher (comes with Node.js) |
| RAM | 2GB minimum (4GB recommended) |
| Disk Space | 500MB |

### Installation

1. **Install Node.js**
   - Download from: https://nodejs.org/
   - Download the LTS (Long Term Support) version
   - Installation will include npm automatically

2. **Verify Installation**
   ```bash
   node --version    # Should show v16.0.0 or higher
   npm --version     # Should show 8.0.0 or higher
   ```

---

## 🚀 Quick Start (5 minutes)

### Option A: Command Line

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies (only once)
npm install

# Start development server
npm run dev
```

**Open your browser to:** http://localhost:5173

You'll see the dashboard with sample data immediately!

### Option B: Using an IDE

If using VS Code:

1. Open the project folder: `File` → `Open Folder` → select `system thesis`
2. Open terminal: `Ctrl + ```
3. Run commands:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. Click the link in terminal (http://localhost:5173)

---

## 🎯 Folder Structure

```
system thesis/
└── frontend/                  # React + TypeScript dashboard
    ├── src/
    │   ├── components/       # React components (MetricsCard, Charts, etc.)
    │   ├── pages/           # Dashboard and Settings pages
    │   ├── services/        # api.ts (routes to Mock API) + mockApi.ts
    │   ├── contexts/        # Toast and Dark Mode providers
    │   ├── types/           # TypeScript interfaces
    │   ├── hooks/           # Custom hooks
    │   ├── utils/           # Utility functions
    │   ├── App.tsx
    │   └── main.tsx
    ├── public/
    ├── index.html
    ├── vite.config.ts       # Vite configuration
    ├── tailwind.config.js    # Tailwind CSS configuration
    ├── vitest.config.ts      # Test configuration
    ├── package.json
    └── package-lock.json
```

---

## 💻 Installation Steps

### Step 1: Extract Project Files

1. Extract the project archive if you haven't already
2. Navigate to the project folder:
   ```bash
   cd "system thesis"
   ```
   (Adjust path if on macOS/Linux or if extracted elsewhere)

### Step 2: Install Dependencies

Dependencies are Node.js packages the project needs to run.

```bash
cd frontend
npm install
```

This will:
- Download ~300 packages
- Create a `node_modules/` folder
- Take 2-3 minutes on first run

**Expected Output:**
```
added XXX packages in XX seconds
```

### Step 3: Start Development Server

```bash
npm run dev
```

**Expected Output:**
```
VITE v5.0.0  ready in 234 ms

➜  Local:   http://localhost:5173/
```

### Step 4: Open in Browser

Click the link or navigate to: **http://localhost:5173**

You should see the ML Monitoring Dashboard! ✅

---

## 📊 First Time Using the Dashboard

### What You'll See

1. **Header** with theme toggle (light/dark mode)
2. **6 Navigation Tabs**:
   - 📊 Overview - Quick statistics
   - 📈 Metrics - Charts and trends
   - ⚠️ Alerts - Drift detection
   - 🔄 Retraining - Job tracking
   - 🔗 API - Endpoint monitoring
   - 📥 Export - Data export

3. **Sample Data** - All mock data auto-refreshing every 30 seconds

### Try These Actions

- 🌙 Toggle dark mode (top-right button)
- 📊 View metrics charts
- ⚠️ Resolve a drift alert by clicking the X button
- 🔄 Start a retraining job
- ⚙️ Open Settings (gear icon) to configure options
- 📥 Export data as CSV or JSON

---

## ⚙️ Configuration

### Dashboard Settings

Access via the Settings page (gear icon in header):

#### Drift Detection Settings
- **Drift Threshold**: How sensitive alerts are (1-50%)
- **Auto-resolve Old Alerts**: Automatically close alerts after time
- **Alert Sounds**: Enable audio notifications

#### Refresh Interval
- **Dashboard Refresh**: How often data updates (10-300 seconds)

#### Data Management
- **Keep Metrics**: How many historical records to store (100-5000)

**Settings are saved automatically to browser storage.**

### Environment Configuration

By default, the frontend uses mock API data. To use a real backend later:

1. Open `frontend/src/services/api.ts`
2. Find this line:
   ```typescript
   const USE_MOCK_API = true;
   ```
3. Change to:
   ```typescript
   const USE_MOCK_API = false;
   ```
4. Ensure backend API is running on `http://localhost:3000/api`
5. Restart dev server

---

## 🧪 Running Tests

The project includes unit tests to verify everything works:

```bash
# Run all tests
npm test

# Run tests in visual mode
npm run test:ui

# Generate coverage report
npm run test:coverage
```

---

## 🔧 Development Commands

Inside the `frontend/` folder:

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (hot reload) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm test` | Run unit tests |
| `npm run lint` | Check code quality |
| `npm run type-check` | Verify TypeScript types |

---

## 🆘 Troubleshooting

### Issue: npm command not found
**Solution:** 
- Install Node.js from https://nodejs.org/
- Restart your terminal/PowerShell
- Verify with: `npm --version`

### Issue: Dashboard shows "Loading..." forever
**Possible Causes:**
1. Dev server crashed
   - Check terminal for errors
   - Restart with `npm run dev`

2. Port issue
   - Another app might be using port 5173
   - Try: `npm run dev -- --port 5174`

3. Browser cache
   - Clear cache: `Ctrl + Shift + Delete` (Chrome/Edge)
   - Or open in new Incognito window

### Issue: npm install fails
**Solution:**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Issue: Module errors in console
**Solution:**
1. Stop dev server (Ctrl + C in terminal)
2. Run:
   ```bash
   npm install
   npm run dev
   ```

### Issue: Port 5173 already in use
**Solution:**
```bash
# Use different port
npm run dev -- --port 5174

# Or find and stop process using 5173
# Windows PowerShell:
Get-Process | Where-Object { $_.ProcessName -contains "*node*" }
```

### Issue: Styles not loading (no Tailwind CSS)
**Solution:**
1. Clear browser cache
2. Clear node_modules:
   ```bash
   rm -rf node_modules
   npm install
   npm run dev
   ```

---

## 🌐 Accessing the Dashboard

Once running, access via:

- **Local (same machine)**: http://localhost:5173
- **Network (other machines)**: http://YOUR_IP:5173
  - Find YOUR_IP in terminal output or use: `ipconfig` (Windows) / `ifconfig` (Mac/Linux)

---

## 📝 Typical Workflow

### Day 1 - Installation
```bash
cd frontend
npm install          # Takes 2-3 minutes, one-time only
npm run dev          # Starts development server
# Keep this terminal open while developing
```

### Day 2+ - Development
```bash
cd frontend
npm run dev          # Code changes auto-reload
```

### Building for Production
```bash
cd frontend
npm run build        # Creates optimized build
npm run preview      # Preview the built version
```

---

## 🚀 Next Steps

### Explore the Dashboard
1. Look at different tabs
2. Open Developer Tools (F12) to understand structure
3. Try Settings to customize behavior
4. Test data export feature

### Add Your Own Data (Later)
When accessing a real backend:
1. Set `USE_MOCK_API = false` in `src/services/api.ts`
2. Create Express.js backend on port 3000
3. Implement the API endpoints (documented in FEATURES.md)
4. Restart dev server

### Understand the Code
- **Components**: Located in `src/components/`
- **Pages**: Located in `src/pages/`
- **API Integration**: Located in `src/services/`
- **Type Definitions**: Located in `src/types/`
- **Styling**: Tailwind CSS classes in components + `index.css`

---

## 📚 Additional Resources

- **Frontend Features**: See [frontend/FEATURES.md](./frontend/FEATURES.md) (50+ pages of component details)
- **Performance Tips**: See [frontend/PERFORMANCE.md](./frontend/PERFORMANCE.md)
- **Enhancements Made**: See [frontend/ENHANCEMENTS.md](./frontend/ENHANCEMENTS.md)
- **Main README**: See [README.md](./README.md)

---

## ✅ Verification Checklist

After setup, you should be able to:

- [ ] Run `npm run dev` without errors
- [ ] Open http://localhost:5173 in browser
- [ ] See the dashboard with sample data
- [ ] Click between tabs without errors
- [ ] Toggle dark mode (top-right button)
- [ ] Open Settings and see options
- [ ] Resolve a drift alert
- [ ] Start a retraining job
- [ ] Export data as CSV

If any of these fail, check the Troubleshooting section above.

---

## 🎓 System Architecture

### Current State (Frontend Only)
```
Browser
   ↓
Frontend (React, TypeScript)
   ↓
Mock API Service (mockApi.ts)
   ↓
Sample Data (in-memory)
```

No backend, database, or external services needed!

### Future State (With Backend)
```
Browser
   ↓
Frontend (React, TypeScript)
   ↓
Real API Layer (api.ts - USE_MOCK_API = false)
   ↓
Backend (Express.js)
   ↓
PostgreSQL Database
```

Simply change one flag and connect to real backend when ready!

---

## 💡 Tips & Tricks

1. **Hot Reload**: Changes to code automatically reflect in browser (no refresh needed)

2. **Dark Mode**: Preference saved to browser storage, persists between sessions

3. **Settings**: All dashboard settings stored in browser, can be reset anytime

4. **Data Persistence**: Mock data resets when you refresh (by design), real backend will persist

5. **Console Access**: Open Developer Tools (F12) → Console to see debug logs

6. **Network Tab**: F12 → Network to see mock API calls with realistic delays

---

## 🔒 Data Privacy

- All data in mock mode stays in your browser
- Nothing is sent to external servers
- Browser storage can be cleared anytime
- No authentication needed for development

---

## 📞 Getting Help

1. Check [QUICKSTART.md](./QUICKSTART.md) for common questions
2. Review error messages in browser console (F12)
3. Check terminal where dev server is running
4. Review source code comments in `src/`

---

**You're all set! Dashboard should be running at http://localhost:5173 🎉**
