import { ToastProvider } from './contexts/ToastContext'
import { DarkModeProvider } from './contexts/DarkModeContext'
import { useDarkMode } from './contexts/DarkModeContext'
import { Dashboard } from './pages/Dashboard'
import { ToastContainer } from './components/ToastContainer'

function AppContent() {
  const { isDarkMode } = useDarkMode()

  return (
    <div className={`w-full min-h-screen transition-colors duration-200 ${isDarkMode ? 'dark bg-slate-950' : 'bg-gray-50'}`}>
      <Dashboard />
      <ToastContainer />
    </div>
  )
}

function App() {
  return (
    <DarkModeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </DarkModeProvider>
  )
}

export default App
