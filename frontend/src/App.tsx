import { useState } from 'react'
import { ToastProvider } from './contexts/ToastContext'
import { DarkModeProvider } from './contexts/DarkModeContext'
import { useDarkMode } from './contexts/DarkModeContext'
import { Dashboard } from './pages/Dashboard'
import { SettingsPage } from './pages/Settings'
import { ToastContainer } from './components/ToastContainer'

function AppContent() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { isDarkMode } = useDarkMode()

  return (
    <div className={`w-full min-h-screen transition-colors duration-200 ${isDarkMode ? 'dark bg-slate-950' : 'bg-gray-50'}`}>
      <Dashboard onSettingsClick={() => setIsSettingsOpen(true)} />

      {isSettingsOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
            isDarkMode ? 'bg-black/70' : 'bg-slate-900/40'
          }`}
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="w-full max-w-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <SettingsPage onClose={() => setIsSettingsOpen(false)} asModal />
          </div>
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
