import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import { AccessibilityProvider } from '@/context/AccessibilityContext'
import { ChatProvider } from '@/context/ChatContext'
import App from '@/App'
import ErrorBoundary from '@/components/ErrorBoundary'
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
