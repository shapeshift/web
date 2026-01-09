/**
 * Web Worker for IndexedDB operations.
 * Moves IndexedDB reads/writes off the main thread to prevent UI blocking,
 * especially important for Firefox where IndexedDB is significantly slower.
 */

import localforage from 'localforage'

let isReady = false
let readyPromise: Promise<void> | null = null

const ensureReady = (): Promise<void> => {
  if (isReady) return Promise.resolve()
  if (!readyPromise) {
    readyPromise = localforage.ready().then(() => {
      isReady = true
    })
  }
  return readyPromise
}

export type IndexedDBWorkerInboundMessage =
  | { type: 'ping' }
  | { type: 'getItem'; requestId: number; key: string }
  | { type: 'setItem'; requestId: number; key: string; value: unknown }
  | { type: 'removeItem'; requestId: number; key: string }

export type IndexedDBWorkerOutboundMessage =
  | { type: 'ready' }
  | { type: 'getItemResult'; requestId: number; value: unknown; duration: number }
  | { type: 'setItemResult'; requestId: number; value: unknown; duration: number }
  | { type: 'removeItemResult'; requestId: number; duration: number }
  | { type: 'error'; requestId: number; error: string }

const handleGetItem = async (requestId: number, key: string): Promise<void> => {
  const start = performance.now()
  try {
    const value = await localforage.getItem(key)
    const duration = performance.now() - start
    const result: IndexedDBWorkerOutboundMessage = {
      type: 'getItemResult',
      requestId,
      value,
      duration,
    }
    postMessage(result)
  } catch (err) {
    const result: IndexedDBWorkerOutboundMessage = {
      type: 'error',
      requestId,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
    postMessage(result)
  }
}

const handleSetItem = async (requestId: number, key: string, value: unknown): Promise<void> => {
  const start = performance.now()
  try {
    await localforage.setItem(key, value)
    const duration = performance.now() - start
    const result: IndexedDBWorkerOutboundMessage = {
      type: 'setItemResult',
      requestId,
      value,
      duration,
    }
    postMessage(result)
  } catch (err) {
    const result: IndexedDBWorkerOutboundMessage = {
      type: 'error',
      requestId,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
    postMessage(result)
  }
}

const handleRemoveItem = async (requestId: number, key: string): Promise<void> => {
  const start = performance.now()
  try {
    await localforage.removeItem(key)
    const duration = performance.now() - start
    const result: IndexedDBWorkerOutboundMessage = {
      type: 'removeItemResult',
      requestId,
      duration,
    }
    postMessage(result)
  } catch (err) {
    const result: IndexedDBWorkerOutboundMessage = {
      type: 'error',
      requestId,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
    postMessage(result)
  }
}

// eslint-disable-next-line no-restricted-globals
self.onmessage = async (event: MessageEvent<IndexedDBWorkerInboundMessage>) => {
  const data = event.data

  if (data.type === 'ping') {
    await ensureReady()
    postMessage({ type: 'ready' })
    return
  }

  await ensureReady()

  switch (data.type) {
    case 'getItem':
      handleGetItem(data.requestId, data.key)
      break
    case 'setItem':
      handleSetItem(data.requestId, data.key, data.value)
      break
    case 'removeItem':
      handleRemoveItem(data.requestId, data.key)
      break
    default:
      break
  }
}

export {}
