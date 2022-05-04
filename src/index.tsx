import 'lib/polyfills'

import React from 'react'
import ReactDOM from 'react-dom'
import { renderConsoleArt } from 'lib/consoleArt'
import { logger } from 'lib/logger'
import { reportWebVitals } from 'lib/reportWebVitals'

import { App } from './App'
import { AppProviders } from './AppProviders'
import * as serviceWorkerRegistration from './serviceWorkerRegistration'

ReactDOM.render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
  document.getElementById('root'),
)

serviceWorkerRegistration.register()

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(vitals => logger.debug({ vitals }, 'Web Vitals'))

// Because ASCII Art
renderConsoleArt()
