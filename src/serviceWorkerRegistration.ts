// The service-worker doesn't load when use `yarn dev`. You need to do a
// `yarn build && http-server build` and serve up the compiled output

import { logger } from 'lib/logger'
const moduleLogger = logger.child({ namespace: ['serviceWorkerRegistration'] })
type ServiceWorkerCallbacks = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void
  onUpdate?: (registration: ServiceWorkerRegistration) => void
}

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === '[::1]' ||
    // 127.0.0.0/8 are considered localhost for IPv4.
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/),
)

// --- Internal Functions ---

async function registerValidSW(swUrl: string, callbacks?: ServiceWorkerCallbacks) {
  try {
    const registration = await navigator.serviceWorker.register(swUrl)
    registration.onupdatefound = () => {
      const installingWorker = registration.installing
      if (!installingWorker) return

      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // At this point, the updated precached content has been fetched,
            // but the previous service worker will still serve the older
            // content until all client tabs are closed.
            moduleLogger.info('ServiceWorker:installed:onUpdate')
            callbacks?.onUpdate?.(registration)
          } else {
            // At this point, everything has been precached.
            moduleLogger.info('ServiceWorker:installed:onSuccess')
            callbacks?.onSuccess?.(registration)
          }
        }
      }
    }
  } catch (e) {
    moduleLogger.error(e, 'ServiceWorker:registerValidSW:Error')
  }
}

async function checkValidServiceWorker(swUrl: string, callbacks?: ServiceWorkerCallbacks) {
  // Check if the service worker can be found. If it can't reload the page.
  try {
    const response = await fetch(swUrl, { headers: { 'Service-Worker': 'script' } })
    // Ensure service worker exists, and that we really are getting a JS file.
    const contentType = response.headers.get('content-type')
    if (response.status === 404 || contentType?.indexOf('javascript') === -1) {
      // No service worker found. Probably a different app. Reload the page.
      const reg = await navigator.serviceWorker.ready
      await reg.unregister()
      window.location.reload()
    } else {
      // Service worker found. Proceed as normal.
      await registerValidSW(swUrl, callbacks)
    }
  } catch (e) {
    moduleLogger.warn('ServiceWorker:checkValidServiceWorker - No internet connection found.')
  }
}

// --- Exported Functions ---

/**
 * Unregister the service worker
 */
export async function unregister() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready
      await reg.unregister()
    } catch (e) {
      moduleLogger.error(e, 'ServiceWorker:unregister:Error')
    }
  }
}

/**
 * Register the service worker
 */
export function register(callbacks?: ServiceWorkerCallbacks) {
  // @TODO: process.env.NODE_ENV === 'production'
  if ('serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href)

    if (publicUrl.origin !== window.location.origin) {
      // Our service worker won't work if PUBLIC_URL is on a different origin
      // from what our page is served on. This might happen if a CDN is used to
      // serve assets; see https://github.com/facebook/create-react-app/issues/2374
      return
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`
      if (isLocalhost) {
        // This is running on localhost. Let's check if a service worker still exists or not.
        void checkValidServiceWorker(swUrl, callbacks)

        // Add some additional logging to localhost, pointing developers to the
        // service worker/PWA documentation.
        navigator.serviceWorker.ready.then(() => moduleLogger.info('ServiceWorker:ready'))
      } else {
        // Is not localhost. Just register service worker
        void registerValidSW(swUrl, callbacks)
      }
    })
  }
}
