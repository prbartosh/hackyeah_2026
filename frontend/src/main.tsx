import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import { AccessibilityProvider } from '@/context/AccessibilityContext'
import { ChatProvider } from '@/context/ChatContext'
import App from '@/App'
import ErrorBoundary from '@/components/ErrorBoundary'
import TourProvider from '@/tour/engine/TourProvider'
import '@fontsource/open-sans/latin-400.css'
import '@fontsource/open-sans/latin-ext-400.css'
import '@fontsource/open-sans/latin-600.css'
import '@fontsource/open-sans/latin-ext-600.css'
import '@fontsource/open-sans/latin-700.css'
import '@fontsource/open-sans/latin-ext-700.css'
import '@fontsource/open-sans/latin-800.css'
import '@fontsource/open-sans/latin-ext-800.css'
import '@/styles/index.css'
import '@/styles/malopolska.css'
import '@/styles/tour.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AccessibilityProvider>
        <ErrorBoundary variant="page">
          <ChatProvider>
            <TourProvider>
              <App />
            </TourProvider>
          </ChatProvider>
        </ErrorBoundary>
      </AccessibilityProvider>
    </BrowserRouter>
  </StrictMode>,
)
