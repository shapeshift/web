import 'lib/polyfills'

import { App } from 'App'
import { AppProviders } from 'AppProviders'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { renderConsoleArt } from 'lib/consoleArt'
import { logger } from 'lib/logger'
import { reportWebVitals } from 'lib/reportWebVitals'

import * as serviceWorkerRegistration from './serviceWorkerRegistration'

const root = createRoot(document.getElementById('root')!)

root.render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
)

serviceWorkerRegistration.register()

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(vitals => logger.debug({ vitals }, 'Web Vitals'))

// Because ASCII Art
renderConsoleArt()
