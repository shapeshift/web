/// <reference lib="webworker" />

import { logger } from 'lib/logger'
const moduleLogger = logger.child({ namespace: ['service-worker'] })
declare const self: ServiceWorkerGlobalScope &
  typeof globalThis & { __WB_MANIFEST: { revision: string | null; url: string } }

export {}

// create-react-app calls workbox-webpack-plugin.InjectManifest by default
// and will throw an error if __WEB_MANIFEST isn't referenced in the service worker file
// @ts-ignore: declaring manifest breaks the noUnusedLocals TS rule, but is required in this file as per the comments above
const manifest = self.__WB_MANIFEST /* eslint-disable-line @typescript-eslint/no-unused-vars */

self.addEventListener('activate', () => self.clients.claim())

self.addEventListener('install', event => {
  moduleLogger.info(event, 'ServiceWorker:install')
  event.waitUntil(
    (async () => {
      try {
        moduleLogger.info('ServiceWorker:install:skipWaiting')
        await self.skipWaiting()
      } catch (e) {
        moduleLogger.error(e, 'ServiceWorker:install:Error')
      }
    })(),
  )
})

self.addEventListener('message', event => {
  moduleLogger.info(event, 'ServiceWorker:message')
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', _ => {})
