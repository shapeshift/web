/// <reference lib="WebWorker" />

import { transformNavigation } from './transformNavigation'

declare const self: ServiceWorkerGlobalScope & typeof globalThis

// eslint-disable-next-line no-restricted-globals
self.addEventListener('install', event => {
  console.info('sw: install', event)
  event.waitUntil(
    (async () => {
      // eslint-disable-next-line no-restricted-globals
      await self.skipWaiting()
      console.info('sw: skipped waiting')
    })(),
  )
})

// eslint-disable-next-line no-restricted-globals
self.addEventListener('activate', event => {
  console.info('sw: activate', event)
  event.waitUntil(
    (async () => {
      // eslint-disable-next-line no-restricted-globals
      await self.clients.claim()
      console.info('sw: claimed')
    })(),
  )
})

// eslint-disable-next-line no-restricted-globals
self.addEventListener('fetch', event => {
  const req = event.request
  if (req.mode === 'navigate') {
    console.info(`sw: navigating to ${req.url}`)
    event.respondWith(
      (async () => {
        const res = await fetch(req)
        const headers = new Headers(Array.from(res.headers.entries()))
        const body = new Uint8Array(await res.arrayBuffer())
        return new Response(transformNavigation(headers, body), {
          status: res.status,
          statusText: res.statusText,
          headers,
        })
      })(),
    )
  }
})
