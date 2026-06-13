import React from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import AppRoutes from './presentation/routes/AppRoutes'
import ErrorBoundary from './presentation/components/ErrorBoundary'
import QueryProvider from './presentation/components/QueryProvider'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryProvider>
        <Toaster position="top-right" richColors closeButton />
        <AppRoutes />
      </QueryProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
