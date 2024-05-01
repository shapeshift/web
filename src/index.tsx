import './wdyr'
import 'lib/polyfills'

import * as Sentry from '@sentry/react'
import { App } from 'App'
import { AppProviders } from 'AppProviders'
import { getConfig } from 'config'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { renderConsoleArt } from 'lib/consoleArt'
import { reportWebVitals } from 'lib/reportWebVitals'

import * as serviceWorkerRegistration from './serviceWorkerRegistration'

Sentry.init({
  ...(window.location.hostname === 'localhost'
    ? {}
    : { dsn: getConfig().REACT_APP_SENTRY_DSN_URL }),
  attachStacktrace: true,
  denyUrls: ['alchemy.com'],
  integrations: [
    // Sentry.browserTracingIntegration(),
    // Sentry.replayIntegration(),
    Sentry.httpClientIntegration({
      failedRequestStatusCodes: [
        [400, 428],
        // i.e no 429s
        [430, 599],
      ],
    }),
    Sentry.browserApiErrorsIntegration(),
    Sentry.breadcrumbsIntegration(),
    Sentry.globalHandlersIntegration(),
    Sentry.httpContextIntegration(),
  ],
  beforeSend(event) {
    // https://github.com/getsentry/sentry-javascript/issues/8353 / https://forum.sentry.io/t/turn-off-event-grouping/10916/3
    event.fingerprint = [(Math.random() * 1000000).toString()]
    return event
  },
  enableTracing: true,
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ['localhost'],
})

const rootElement = document.getElementById('root')!
const root = createRoot(rootElement)

rootElement.setAttribute('vaul-drawer-wrapper', '')
rootElement.classList.add('app-height')

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
reportWebVitals(vitals => console.debug({ vitals }, 'Web Vitals'))

// Because ASCII Art
renderConsoleArt()
