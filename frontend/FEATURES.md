# Frontend Features Guide

## 🎯 Overview

This guide documents all frontend features, components, and usage patterns for the ML Monitoring System.

## 📋 Components

### Data Display Components

#### MetricsCard
Displays key performance metrics for a model.
```tsx
<MetricsCard metric={modelMetric} />
```
**Props:**
- `metric: ModelMetrics` - Metric data to display

**Displays:**
- Accuracy (%)
- Precision (%)
- Recall (%)
- F1 Score (%)
- Last updated timestamp

---

#### DriftAlertCard
Shows drift detection alerts with resolution capability.
```tsx
<DriftAlertCard alert={alert} onResolve={handleResolveAlert} />
```
**Props:**
- `alert: DriftAlert` - Alert data
- `onResolve: (alertId: string) => void` - Resolution callback

**Features:**
- Color-coded severity (red/yellow/blue)
- Threshold vs Current value comparison
- Resolve button for unresolved alerts
- Timestamp display

---

#### RetrainingJobCard
Tracks auto-retraining job execution.
```tsx
<RetrainingJobCard job={job} onRetrain={handleStartRetraining} />
```
**Props:**
- `job: RetrainingJob` - Job data
- `onRetrain: (modelId: string) => void` - Start retraining callback

**Features:**
- Status indicator (pending/running/completed/failed)
- Start/end times
- Accuracy improvements
- Error messages for failed jobs

---

#### APIEndpointCard
Monitors API endpoint health and performance.
```tsx
<APIEndpointCard endpoint={endpoint} onCheck={handleCheckEndpoint} />
```
**Props:**
- `endpoint: APIEndpoint` - Endpoint data
- `onCheck: (endpointId: string) => void` - Check status callback

**Features:**
- Active/inactive status indicator
- Response time in milliseconds
- Last check timestamp
- Manual health check button

---

### Chart Components

#### MetricsChart
Line chart showing metrics trends over time.
```tsx
<MetricsChart metrics={metrics} title="Model Metrics Over Time" />
```
**Props:**
- `metrics: ModelMetrics[]` - Historical metrics
- `title?: string` - Chart title

**Displays:**
- Accuracy trend
- Precision trend
- Recall trend
- Last 10 data points

**Features:**
- Interactive legend
- Hover tooltips
- Responsive design

---

#### PerformanceChart
Horizontal bar chart for latest metrics.
```tsx
<PerformanceChart latest={metric} title="Latest Model Performance" />
```
**Props:**
- `latest: ModelMetrics | null` - Latest metric
- `title?: string` - Chart title

**Displays:**
- Accuracy comparison
- Precision comparison
- Recall comparison
- F1 Score comparison

---

### Statistics Components

#### DriftStats
Summary statistics for drift alerts.
```tsx
<DriftStats alerts={alerts} />
```
**Props:**
- `alerts: DriftAlert[]` - Alert data

**Shows:**
- Total alerts
- Unresolved count
- High severity count
- Resolved count

---

#### RetrainingStats
Summary statistics for retraining jobs.
```tsx
<RetrainingStats jobs={jobs} />
```
**Props:**
- `jobs: RetrainingJob[]` - Job data

**Shows:**
- Total jobs
- Completed count
- Running count
- Average accuracy improvement

---

### Navigation & Layout

#### Header
Top navigation bar with theme toggle and settings.
```tsx
<Header onSettingsClick={() => setCurrentPage('settings')} />
```
**Props:**
- `onSettingsClick: () => void` - Settings button callback

**Features:**
- Logo and title
- Dark mode toggle
- Settings button

---

#### Tabs
Tab navigation for dashboard sections.
```tsx
<Tabs 
  activeTab={activeTab} 
  tabs={[
    { id: 'overview', label: 'Overview' },
    { id: 'metrics', label: 'Metrics' },
  ]} 
  onTabChange={setActiveTab} 
/>
```
**Props:**
- `activeTab: string` - Currently active tab ID
- `tabs: { id: string; label: string }[]` - Tab definitions
- `onTabChange: (tabId: string) => void` - Tab change callback

---

### Data Management

#### DataExport
Export data to CSV and JSON formats.
```tsx
<DataExport 
  metrics={metrics}
  alerts={alerts}
  jobs={jobs}
  endpoints={endpoints}
/>
```
**Props:**
- `metrics: ModelMetrics[]` - Metrics to export
- `alerts: DriftAlert[]` - Alerts to export
- `jobs: RetrainingJob[]` - Jobs to export
- `endpoints: APIEndpoint[]` - Endpoints to export

**Features:**
- Export by category (metrics, alerts, jobs, full export)
- CSV and JSON formats
- Timestamped filenames
- Full system backup

---

### Notifications & Loading

#### ToastContainer
Displays toast notifications.
```tsx
<ToastContainer />
```
**Usage:**
```tsx
const { addToast } = useToast();
addToast('Success!', 'success', 3000);  // Disappears after 3s
addToast('Error occurred', 'error');    // Manual close only
```
**Toast Types:** success | error | warning | info

---

#### LoadingSkeleton
Placeholder during data loading.
```tsx
<LoadingSkeleton count={3} height="h-20" />
```

#### CardSkeleton & ChartSkeleton
Specialized skeletons for cards and charts.
```tsx
<CardSkeleton />
<ChartSkeleton />
```

---

#### ErrorBoundary
Catches React errors gracefully.
```tsx
<ErrorBoundary fallback={<CustomError />}>
  <YourComponent />
</ErrorBoundary>
```

---

## 📄 Pages

### Dashboard
Main monitoring page with tabbed interface.

**Tabs:**
1. **Overview** - Quick stats, latest metrics, drift/retraining stats
2. **Metrics** - Performance chart + historical trends
3. **Alerts** - Alert statistics and list
4. **Retraining** - Job statistics and queue
5. **API** - Endpoint status and health
6. **Export** - Data export functionality

---

### Settings
Configuration page for user preferences.

**Settings Categories:**
1. **Drift Detection**
   - Drift threshold (1-50%)
   - Alert sounds toggle
   - Auto-resolve toggle

2. **Dashboard**
   - Auto-refresh interval (10-300s)

3. **Data Management**
   - Metrics retention (100-5000)

---

## 🎨 Contexts

### ToastContext
Notification/toast management.
```tsx
const { toasts, addToast, removeToast } = useToast();

// Add notification
addToast('Message', 'success', 3000);

// Remove notification
removeToast(toastId);
```

---

### DarkModeContext
Theme management.
```tsx
const { isDarkMode, toggleDarkMode } = useDarkMode();
```

---

## 🔧 Custom Hooks

### useFetch
Generic data fetching hook.
```tsx
const { data, loading, error } = useFetch<T>(url, options);
```

---

## 🛠️ Utility Functions

### Storage Utilities
```tsx
import { storageUtils } from './utils/helpers';

storageUtils.setItem('key', value);
const value = storageUtils.getItem('key', defaultValue);
storageUtils.removeItem('key');
```

### Format Utilities
```tsx
import { formatUtils } from './utils/helpers';

formatUtils.percentage(0.95);        // "95.00%"
formatUtils.decimal(3.14159, 2);     // "3.14"
formatUtils.milliseconds(1500);      // "1.50s"
```

### Date Utilities
```tsx
import { dateUtils } from './utils/helpers';

dateUtils.format(date);              // "2/25/2026, 10:30:00 AM"
dateUtils.fromNow(date);             // "2h ago"
```

### Array Utilities
```tsx
import { arrayUtils } from './utils/helpers';

arrayUtils.groupBy(items, 'severity');
arrayUtils.sortBy(items, 'timestamp', false);
arrayUtils.unique(items, 'id');
```

---

## 🎯 Responsive Design

### Breakpoints (Tailwind)
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px

### Grid Layouts
```tsx
// Responsive 4-column, 2-column on mobile
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

---

## ♿ Accessibility

### Semantic HTML
- Use `<button>` for clickable elements
- Use `<header>`, `<nav>`, `<main>` for structure
- Use `<section>`, `<article>` for content

### ARIA Labels
```tsx
<button aria-label="Close notification">✕</button>
```

### Keyboard Navigation
- Tab through interactive elements
- Enter to activate buttons
- Escape to close modals (future)

---

## 🧪 Testing Examples

### Testing Components
```tsx
import { render, screen } from '@testing-library/react';
import { MetricsCard } from '@/components/MetricsCard';

it('displays metric values', () => {
  const metric = { accuracy: 0.95, ... };
  render(<MetricsCard metric={metric} />);
  expect(screen.getByText('95.00%')).toBeInTheDocument();
});
```

### Testing Utilities
```tsx
import { formatUtils } from '@/utils/helpers';

it('formats percentages correctly', () => {
  expect(formatUtils.percentage(0.95)).toBe('95.00%');
});
```

---

## 🚀 Performance Tips

1. **Use Memo for Pure Components**
   ```tsx
   export const Component = React.memo(({ prop }) => ...);
   ```

2. **Lazy Load Charts**
   ```tsx
   const MetricsChart = React.lazy(() => import('./MetricsChart'));
   ```

3. **Optimize Re-renders**
   ```tsx
   const memoValue = useMemo(() => expensiveCalc(), [deps]);
   const memoCallback = useCallback(() => {...}, [deps]);
   ```

4. **Code Splitting**
   - Settings page loads separately
   - Charts load on demand

---

## 📱 Mobile Experience

- Full responsive design
- Touch-friendly buttons (44px minimum)
- Mobile-optimized charts
- Simplified tab navigation on small screens

---

## 🔗 API Integration

### Fetch Flow
1. Component calls `useFetch()` hook
2. Hook calls API service (`api.ts`)
3. Service makes HTTP request via axios
4. Response converted to TypeScript types
5. Data set in component state
6. Component re-renders with new data

### Error Handling
```tsx
try {
  const data = await apiFunction();
  addToast(`Success!`, 'success');
} catch (error) {
  addToast(`Error: ${error.message}`, 'error');
}
```

---

## 🎓 Best Practices

1. **Component Naming** - PascalCase for components
2. **Props Drilling** - Use Context for deeply nested data
3. **State Management** - Use local state first, Context for global
4. **Type Safety** - Always type props with interfaces
5. **Error Boundaries** - Wrap sections that might error
6. **Performance** - Profile with React DevTools
7. **Testing** - Test behavior, not implementation
8. **Accessibility** - Test with keyboard navigation

---

## 📚 Resources

- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Chart.js](https://www.chartjs.org)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Vitest Documentation](https://vitest.dev)
