/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope &
  typeof globalThis & { __WB_MANIFEST: { revision: string | null; url: string } }

export {}

// create-react-app calls workbox-webpack-plugin.InjectManifest by default
// and will throw an error if __WEB_MANIFEST isn't referenced in the service worker file
// @ts-ignore
const manifest = self.__WB_MANIFEST /* eslint-disable-line @typescript-eslint/no-unused-vars */

self.addEventListener('activate', () => self.clients.claim())

self.addEventListener('install', event => {
  console.info('ServiceWorker:install', event)
  event.waitUntil(
    (async () => {
      try {
        console.info('ServiceWorker:install:skipWaiting')
        await self.skipWaiting()
      } catch (e) {
        console.error('ServiceWorker:install:Error', e)
      }
    })(),
  )
})

self.addEventListener('message', event => {
  console.info('ServiceWorker:message', event)
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', event => {})
