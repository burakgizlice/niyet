import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { StreakProvider } from './context/StreakContext'
import { runMigrations } from './lib/storage'

// Stamp/upgrade the storage schema once before any hook reads localStorage.
runMigrations()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StreakProvider>
      <App />
    </StreakProvider>
  </StrictMode>,
)
