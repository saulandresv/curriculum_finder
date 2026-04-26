// frontend/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { MapCardView } from './views/MapCardView'
import './App.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
  },
})

const isTest = window.location.hash === '#/test'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {isTest ? <MapCardView /> : <App />}
    </QueryClientProvider>
  </React.StrictMode>
)
