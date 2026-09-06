import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import ErrorPage from './components/ErrorPage.jsx'

// Tabs and shared links live on the root URL; other paths are not app routes.
const isAppPath = ['/', '/index.html'].includes(window.location.pathname)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      {isAppPath ? <App /> : <ErrorPage notFound />}
      <Analytics />
    </ErrorBoundary>
  </StrictMode>,
)
