import { useState } from 'react'
import { ToastProvider } from './contexts/ToastContext'
import { DarkModeProvider } from './contexts/DarkModeContext'
import { useDarkMode } from './contexts/DarkModeContext'
import { Dashboard } from './pages/Dashboard'
import { SettingsPage } from './pages/Settings'
import { Header } from './components/Header'
import { ToastContainer } from './components/ToastContainer'

function AppContent() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'settings'>('dashboard')
  const { isDarkMode } = useDarkMode()

  return (
    <div className={`w-full min-h-screen transition-colors duration-200 ${isDarkMode ? 'dark bg-slate-950' : 'bg-gray-50'}`}>
      <Header onSettingsClick={() => setCurrentPage('settings')} />
      
      {currentPage === 'dashboard' && (
        <Dashboard />
      )}
      
      {currentPage === 'settings' && (
        <div>
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="fixed bottom-6 right-6 px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 transition shadow-lg"
          >
            ← Back to Dashboard
          </button>
          <SettingsPage />
        </div>
      )}

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
