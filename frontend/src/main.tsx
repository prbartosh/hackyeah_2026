import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import { AccessibilityProvider } from '@/context/AccessibilityContext'
import { ChatProvider } from '@/context/ChatContext'
import App from '@/App'
import ErrorBoundary from '@/components/ErrorBoundary'
import '@fontsource/open-sans/latin-400.css'
import '@fontsource/open-sans/latin-ext-400.css'
import '@fontsource/open-sans/latin-600.css'
import '@fontsource/open-sans/latin-ext-600.css'
import '@fontsource/open-sans/latin-700.css'
import '@fontsource/open-sans/latin-ext-700.css'
import '@fontsource/open-sans/latin-800.css'
import '@fontsource/open-sans/latin-ext-800.css'
import '@/styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AccessibilityProvider>
        <ErrorBoundary variant="page">
          <ChatProvider>
            <App />
          </ChatProvider>
        </ErrorBoundary>
      </AccessibilityProvider>
    </BrowserRouter>
  </StrictMode>,
)
