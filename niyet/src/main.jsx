import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { StreakProvider } from './context/StreakContext'
import { runMigrations } from './lib/storage'
import { initPWA } from './lib/pwa'

// Stamp/upgrade the storage schema once before any hook reads localStorage.
runMigrations()

// Capture the install prompt as early as possible (it fires once, right after
// load). The service worker itself is registered by vite-plugin-pwa.
initPWA()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StreakProvider>
      <App />
    </StreakProvider>
  </StrictMode>,
)
