import './wdyr'
import 'lib/polyfills'

import * as Sentry from '@sentry/react'
import { App } from 'App'
import { AppProviders } from 'AppProviders'
import { getConfig } from 'config'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { httpClientIntegration } from 'utils/sentry/httpclient'
import { renderConsoleArt } from 'lib/consoleArt'
import { reportWebVitals } from 'lib/reportWebVitals'

import * as serviceWorkerRegistration from './serviceWorkerRegistration'

// Remove this condition to test sentry locally
if (window.location.hostname !== 'localhost') {
  const VALID_ENVS = [
    'localhost',
    'develop',
    'release',
    'app',
    'private',
    'yeet',
    'beard',
    'juice',
    'wood',
    'gome',
  ] as const

  const environment = (() => {
    if (window.location.hostname.includes('app')) return 'production'

    if (VALID_ENVS.some(env => window.location.hostname.includes(env)))
      return window.location.hostname.split('.')[0]
  })()
  Sentry.init({
    environment,
    dsn: getConfig().REACT_APP_SENTRY_DSN_URL,
    attachStacktrace: true,
    integrations: [
      // Sentry.browserTracingIntegration(),
      // Sentry.replayIntegration(),
      httpClientIntegration({
        failedRequestStatusCodes: [
          [400, 428],
          // i.e no 429s
          [430, 599],
        ],

        // denyUrls: ['alchemy.com', 'snapshot.org'],
      }),
      Sentry.browserApiErrorsIntegration(),
      Sentry.breadcrumbsIntegration(),
      Sentry.globalHandlersIntegration(),
      Sentry.httpContextIntegration(),
    ],
    beforeSend(event, hint) {
      // Drop closed ws errors to avoid spew
      if (
        ['failed to reconnect, connection closed' || 'timeout while trying to connect'].includes(
          (hint.originalException as Error | undefined)?.message ?? '',
        )
      )
        return null
      // Group all status 0 XHR errors together using 'XMLHttpRequest Error' as a custom fingerprint.
      // and the ones with a status (i.e with a URL) by their URL.
      // By default, Sentry will group errors based on event.request.url, which is the client-side URL e.g http://localhost:3000/#/trade for status 0 errors.
      // This is not ideal, as having XMLHttpRequest errors while in different parts of the app will result in different groups
      if (event.message?.includes('HTTP Client Error')) {
        if (event.message.includes('status: 0')) {
          event.fingerprint = ['XMLHttpRequest Error']
        } else {
          event.fingerprint = [event.request?.url!]
        }
      }
      // Leave other errors untouched to leverage Sentry's default grouping
      return event
    },
    enableTracing: true,
    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: ['localhost'],
  })
}

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
