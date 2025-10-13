import '@/lib/polyfills'
import '@/pixels/addressable'

import {
  breadcrumbsIntegration,
  browserApiErrorsIntegration,
  globalHandlersIntegration,
  httpContextIntegration,
  init as initSentry,
  setUser,
} from '@sentry/react'
import { TradeQuoteError } from '@shapeshiftoss/swapper'
import { isAxiosError } from 'axios'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { scan } from 'react-scan'
import { v4 as uuid } from 'uuid'

import { App } from './App'
import { AppProviders } from './AppProviders'
import { getConfig } from './config'
import { renderConsoleArt } from './lib/consoleArt'
import { reportWebVitals } from './lib/reportWebVitals'
import { httpClientIntegration } from './utils/sentry/httpclient'

const enableReactScan = false

const SENTRY_ENABLED = true

scan({
  enabled: window.location.hostname === 'localhost' && enableReactScan,
})

// Remove this condition to test sentry locally
if (window.location.hostname !== 'localhost' && SENTRY_ENABLED) {
  const VALID_ENVS = [
    'localhost',
    'develop',
    'release',
    'app',
    'private',
    'yeet',
    'beard',
    'juice',
    'gome',
    'neo',
    'jib',
  ] as const

  const environment = (() => {
    if (window.location.hostname.includes('app')) return 'production'

    if (VALID_ENVS.some(env => window.location.hostname.includes(env)))
      return window.location.hostname.split('.')[0]
  })()
  initSentry({
    environment,
    dsn: getConfig().VITE_SENTRY_DSN_URL,
    release: `shapeshift-web@${import.meta.env.VITE_VERSION ?? 'unknown'}`,
    attachStacktrace: true,
    // This is the default value, but we're setting it explicitly to make it clear that we're using it
    autoSessionTracking: true,
    ignoreErrors: [
      // Network connectivity errors
      'NetworkError',
      'Failed to fetch',
      'Network request failed',
      'Load failed',
      /timeout of \d+ms exceeded/i,

      // WebSocket errors (defense-in-depth with beforeSend)
      'failed to reconnect, connection closed',
      'timeout while trying to connect',

      // Browser extension errors
      /chrome-extension:/i,
      /extensions\//i,
      /moz-extension:/i,

      // ResizeObserver (common benign error)
      'ResizeObserver loop',

      // User cancelled actions
      'User rejected',
      'User denied',
      'transactionRejected',

      // Common business logic errors that are user-facing
      TradeQuoteError.UnsupportedTradePair,
      TradeQuoteError.NoRouteFound,
      TradeQuoteError.RateLimitExceeded,
    ],
    integrations: [
      // Sentry.browserTracingIntegration(),
      // Sentry.replayIntegration(),
      httpClientIntegration({
        failedRequestStatusCodes: [
          [500, 599], // Only server errors, not client errors
        ],

        denyUrls: [
          'alchemy.com',
          'snapshot.org',
          'coingecko.com',
          'coincap.io',
          'coinmarketcap.com',
        ],
      }),
      browserApiErrorsIntegration(),
      breadcrumbsIntegration(),
      globalHandlersIntegration(),
      httpContextIntegration(),
    ],
    beforeSend(event, hint) {
      const error = hint?.originalException
      const errorMessage = error instanceof Error ? error.message : event.message ?? ''

      // Filter browser extension errors
      if (
        event.request?.url?.includes('extension://') ||
        event.request?.url?.includes('chrome://') ||
        event.request?.url?.includes('moz-extension://')
      ) {
        return null
      }

      // Filter expected trade errors (defense-in-depth with ignoreErrors)
      if (
        errorMessage.includes('TradeQuoteError') ||
        errorMessage.includes(TradeQuoteError.UnsupportedTradePair) ||
        errorMessage.includes(TradeQuoteError.NoRouteFound)
      ) {
        return null
      }

      // Enriches Axios errors with context
      if (isAxiosError(hint?.originalException)) {
        const axiosError = hint.originalException
        if (axiosError.response) {
          const contexts = { ...event.contexts }
          contexts.Axios = {
            Request: axiosError.request,
            Response: axiosError.response,
          }
          event.contexts = contexts
        }
      }

      // Drop closed ws errors to avoid spew (defense-in-depth with ignoreErrors)
      if (
        ['failed to reconnect, connection closed', 'timeout while trying to connect'].some(
          errorPredicate =>
            ((hint.originalException as Error | undefined)?.message ?? '').includes(errorPredicate),
        )
      ) {
        return null
      }

      // Group HTTP Client Errors by URL for better grouping
      // Note: status: 0 errors are filtered at the integration level
      if (event.message?.includes('HTTP Client Error')) {
        event.fingerprint = [event.request?.url ?? 'unknown-url']
      }

      // Add error classification tags
      event.tags = {
        ...(event.tags ?? {}),
        errorType: error instanceof Error ? error.constructor.name : 'unknown',
      }
      }

      // Leave other errors untouched to leverage Sentry's default grouping
      return event
    },
    beforeBreadcrumb(breadcrumb, _hint) {
      // Filter console logs except errors
      if (breadcrumb.category === 'console' && breadcrumb.level !== 'error') {
        return null
      }

      // Filter successful HTTP requests (only keep failures)
      if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
        if (breadcrumb.data?.status_code && breadcrumb.data.status_code < 400) {
          return null
        }
      }

      // Filter UI events (too noisy for error context)
      if (breadcrumb.category === 'ui.click' || breadcrumb.category === 'ui.input') {
        return null
      }

      return breadcrumb
    },
    enableTracing: false,
  })

  // Set a unique user ID if one is not already set
  const sentryUserId = localStorage.getItem('sentry.user.id')
  if (!sentryUserId) {
    const userId = uuid()
    localStorage.setItem('sentry.user.id', userId)
    setUser({ id: userId })
  } else {
    setUser({ id: sentryUserId })
  }
}

// This is actually an usage we can safely ignore, if we don't have #root, we have bigger problems
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(vitals => console.debug({ vitals }, 'Web Vitals'))

// Because ASCII Art
renderConsoleArt()
