# ML Monitoring Frontend

A modern React TypeScript dashboard for real-time ML model monitoring with drift detection, auto-retraining tracking, and API health monitoring.

## 🚀 Features

### Core Features
- ✅ **Real-time Metrics Dashboard** - Live accuracy, precision, recall, F1 score
- ✅ **Drift Detection Alerts** - Statistical anomaly detection with severity levels
- ✅ **Auto-retraining Job Tracking** - Monitor model retraining status and results
- ✅ **API Endpoint Monitoring** - Health checks and response time tracking
- ✅ **Dark Mode Support** - Light/dark theme toggle with localStorage persistence

### Advanced Features
- 📊 **Interactive Charts** - Line charts for historical trends, bar charts for comparisons
- ⚙️ **Settings Page** - Configurable drift thresholds, refresh intervals, data retention
- 📥 **Data Export** - Export metrics, alerts, jobs as CSV or JSON
- 🔔 **Toast Notifications** - Real-time feedback for user actions
- 🧪 **Unit Testing** - Comprehensive test suite with Vitest
- ⚡ **Performance Optimized** - Memoized components, code splitting, lazy loading

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/           # Reusable React components
│   │   ├── Header.tsx       # Navigation header
│   │   ├── Tabs.tsx         # Tab navigation
│   │   ├── MetricsCard.tsx  # Model metrics display
│   │   ├── MetricsChart.tsx # Line chart for metrics
│   │   ├── PerformanceChart.tsx # Bar chart
│   │   ├── DriftAlertCard.tsx # Alert card
│   │   ├── DriftStats.tsx   # Alert statistics
│   │   ├── RetrainingJobCard.tsx # Job card
│   │   ├── RetrainingStats.tsx # Job statistics
│   │   ├── APIEndpointCard.tsx # Endpoint status
│   │   ├── DataExport.tsx   # Export functionality
│   │   ├── ToastContainer.tsx # Notification display
│   │   ├── LoadingSkeleton.tsx # Loading states
│   │   ├── ErrorBoundary.tsx # Error handling
│   │   ├── MemoMetricsCard.tsx # Memoized version
│   │   └── MemoAPIEndpointCard.tsx # Optimized card
│   ├── contexts/            # React Context providers
│   │   ├── ToastContext.tsx # Notification system
│   │   └── DarkModeContext.tsx # Theme management
│   ├── pages/               # Page components
│   │   ├── Dashboard.tsx    # Main dashboard with tabs
│   │   └── Settings.tsx     # Settings page
│   ├── services/            # API integration
│   │   ├── api.ts          # API layer (routes to mock/real)
│   │   └── mockApi.ts      # Mock data service
│   ├── types/               # TypeScript definitions
│   │   └── index.ts        # Type interfaces
│   ├── hooks/               # Custom React hooks
│   │   └── useFetch.ts     # Data fetching hook
│   ├── utils/               # Utility functions
│   │   └── helpers.ts      # Formatting, array, date utils
│   ├── App.tsx             # Root component
│   ├── main.tsx            # Entry point
│   └── index.css           # Tailwind CSS imports
├── index.html              # HTML template
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # Tailwind CSS config
├── tsconfig.json           # TypeScript config
├── vitest.config.ts        # Test configuration
├── package.json            # Dependencies
└── README.md              # This file
```

## 🛠️ Installation

### Prerequisites
- Node.js 16+ and npm

**That's it! No backend or database setup needed.** The frontend includes a mock API service for immediate use.

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Access dashboard at `http://localhost:5173` with sample data immediately!

### Optional: Use Real Backend

When you have a backend API ready:

1. Edit `src/services/api.ts`
2. Change `const USE_MOCK_API = true;` to `false`
3. Ensure your backend API is on `http://localhost:3000/api`
4. Restart dev server

```
### Preview Production Build
```bash
npm run preview
```

### Run Tests
```bash
npm test              # Run tests
npm run test:ui      # Visual test UI
npm run test:coverage # Coverage report
```

### Code Quality
```bash
npm run lint         # ESLint check
npm run type-check   # TypeScript check
```

## 📊 Dashboard Tabs

### Overview
- Quick statistics: Total metrics, alerts, jobs, endpoints
- Latest model metrics card
- Drift and retraining statistics

### Metrics
- Latest model performance (bar chart)
- Metrics over time (line chart with multiple series)
- Accuracy, precision, recall trends

### Alerts
- Alert statistics by severity
- Actionable drift detection alerts
- Manual alert resolution interface

### Retraining
- Retraining job statistics
- Job status tracking (pending, running, completed, failed)
- Accuracy improvements after retraining
- Start new retraining jobs

### API
- API endpoint health status
- Response time monitoring
- Manual endpoint health checks
- Active/inactive status indicators

### Export
- Export metrics to CSV or JSON
- Export alerts and jobs
- Full system backup download
- Timestamped exports

## ⚙️ Settings

### Drift Detection
- **Drift Threshold**: 1-50% (sensitivity for drift alerts)
- **Alert Sounds**: Enable/disable audio notifications
- **Auto-resolve**: Automatically resolve old alerts after 24 hours

### Dashboard
- **Refresh Interval**: 10-300 seconds (auto-update frequency)

### Data Management
- **Metrics Retention**: Keep last 100-5000 records
- Older data automatically archived

## 🎨 Customization

### Theme Colors
Edit `tailwind.config.js`:
```javascript
colors: {
  primary: '#3B82F6',     // Main blue
  secondary: '#10B981',   // Accent green
  warning: '#F59E0B',     // Warning orange
  error: '#EF4444',       // Error red
  dark: '#1F2937',        // Text dark
}
```

### Refresh Interval
Edit `Dashboard.tsx` or user settings (default: 30 seconds)

### Chart Options
Modify `MetricsChart.tsx` and `PerformanceChart.tsx`

## 🧪 Testing

### Test Structure
- `utils.test.ts` - Utility function tests
- `types.test.ts` - Type definition validations

### Run Tests
```bash
npm test                 # All tests
npm test -- utils       # Specific test
npm run test:coverage   # Coverage report
```

### Test Coverage
- Data formatting (percentage, dates, numbers)
- Data validation (metrics, severity, status)
- Data aggregation (filtering, counting, grouping)
- Type structures and interfaces

## 📦 Dependencies

### Core
- **react** (18.2.0) - UI library
- **react-dom** (18.2.0) - DOM rendering
- **axios** (1.6.5) - HTTP client

### Visualization
- **chart.js** (4.4.1) - Chart library
- **react-chartjs-2** (5.2.0) - React wrapper

### Development
- **vite** (5.0+) - Build tool
- **typescript** (5.2+) - Type checking
- **vitest** (1.0+) - Testing framework
- **tailwindcss** (3.3+) - Utility CSS
- **eslint** (8.5+) - Code linting

## 🚀 Performance

### Optimizations
- Component memoization with React.memo
- Code splitting with dynamic imports
- CSS purging with Tailwind
- Efficient re-renders with useCallback/useMemo
- LocalStorage caching for settings

### Bundle Size
- Main bundle: ~150KB (gzipped)
- Chart chunk: ~50KB (lazy loaded)
- CSS: ~30KB (purged)

## 🔒 Security

### Best Practices
- XSS protection with React's built-in escaping
- CSRF tokens (handled by backend)
- Secure localStorage for non-sensitive data
- HTTPS in production

## 🐛 Debugging

### Browser DevTools
1. Press **F12** to open DevTools
2. React DevTools extension recommended
3. Check Console tab for errors

### VS Code Debugging
1. Press **F5** to launch debugger
2. Select "Debug Frontend" configuration
3. Set breakpoints and step through code

## 📚 API Integration

### Metrics Endpoints
- `GET /api/metrics/models` - All models
- `GET /api/metrics/latest` - Latest metrics
- `GET /api/metrics/models/:modelId` - Specific model
- `POST /api/metrics/record` - Record new metrics

### Drift Detection
- `GET /api/drift/alerts` - All alerts
- `PUT /api/drift/alerts/:alertId/resolve` - Resolve alert

### Retraining
- `GET /api/retraining/jobs` - All jobs
- `POST /api/retraining/jobs` - Start job
- `GET /api/retraining/jobs/:jobId` - Job status

### API Monitoring
- `GET /api/endpoints` - All endpoints
- `POST /api/endpoints/:endpointId/check` - Check status

## 🤝 Contributing

Maintain code quality:
```bash
npm run lint              # Check code style
npm run type-check        # Type checking
npm test                  # Run tests
npm run build            # Production build
```

## 📝 Environment Variables

**Frontend (.env - Optional)**
```
# Use this only when switching to real backend
VITE_API_BASE_URL=http://localhost:3000/api
```

## 🆘 Troubleshooting

### Dashboard shows "Loading..."
- Ensure dev server is running: `npm run dev`
- Check terminal for errors
- Try `npm run dev -- --port 5174` if port 5173 is taken
- Clear browser cache (Ctrl+Shift+Delete)

### Charts not showing
- Ensure Chart.js is installed: `npm install chart.js react-chartjs-2`
- Clear browser cache and refresh
- Check F12 console for errors

### Settings not saving
- Check localStorage is enabled in browser
- Clear browser cache if needed
- Check F12 console for errors

### Tests failing
```bash
npm cache clean --force
npm install
npm test
```

### npm install fails
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 📞 Support

See [PERFORMANCE.md](./PERFORMANCE.md) for optimization details.

See [SETUP.md](../SETUP.md) for detailed setup guidance.

See [QUICKSTART.md](../QUICKSTART.md) for quick answers.
