import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Analytics } from '@vercel/analytics/react'

// A public deck link (/flashcards?public=…) should survive the sign-up / welcome screens.
try {
  const pub = new URLSearchParams(window.location.search).get('public')
  if (pub) sessionStorage.setItem('tp_open_public', pub)
} catch { /* ignore */ }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)

// Installable app: remember the browser's install offer so a button can show it later.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__tpInstallPrompt = e
  window.dispatchEvent(new Event('tp-install-ready'))
})
window.addEventListener('appinstalled', () => {
  window.__tpInstallPrompt = null
  window.dispatchEvent(new Event('tp-install-ready'))
})
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) })
}
