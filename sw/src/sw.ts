/// <reference lib="WebWorker" />

import { type ExposedFetchFilterManager } from './fetchFilters'
import { FetchFilterManagers } from './fetchFilters/FetchFilterManagers'
import { type HandlerContext, type SimpleRpcWrapper, SimpleRpc } from './simpleRpc'
import { swStubIntegrity, swVersion } from './swVersion'
import { transformNavigation } from './transformNavigation'

declare const self: ServiceWorkerGlobalScope & typeof globalThis

// eslint-disable-next-line no-restricted-globals
const fetchFilterManagers = new FetchFilterManagers(self.clients, 5 * 1000, [swStubIntegrity])

const rpcMethods = {
  async getVersion(this: HandlerContext<Client>): Promise<string> {
    return swVersion
  },
  async exposeFetchFilterManager(
    this: HandlerContext<Client>,
  ): Promise<SimpleRpcWrapper<ExposedFetchFilterManager>> {
    console.info(
      `sw: exposeFetchFilterManager: exposing fetch filter manager for ${this.source.id}`,
    )
    return this.transfer(fetchFilterManagers.get(this.source.id).expose())
  },
  async stubLoaded(this: HandlerContext<Client>): Promise<void> {
    fetchFilterManagers.get(this.source.id).setReady()
  },
}
export type RpcMethods = typeof rpcMethods

// eslint-disable-next-line no-restricted-globals
const rpcServer = new SimpleRpc<ExtendableMessageEvent & { source: Client }>(rpcMethods, self)
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
rpcServer

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
    event.waitUntil(fetchFilterManagers.scrub())
  } else {
    const fetchFilterManager = fetchFilterManagers.get(event.clientId)
    if (!fetchFilterManager.shouldBypassFilters(req)) {
      event.respondWith(
        fetchFilterManager.fetchWithFilters(req).catch(e => {
          console.error('sw: fetch error', e)
          return Response.error()
        }),
      )
    }
  }
})
