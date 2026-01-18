import '@rainbow-me/rainbowkit/styles.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { AppRoutes } from './Routes'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRoutes />
  </StrictMode>,
)
