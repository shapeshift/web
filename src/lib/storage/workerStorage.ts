/**
 * Storage adapter that uses a Web Worker for IndexedDB operations.
 * This keeps IndexedDB operations off the main thread, preventing UI blocking
 * especially in Firefox where IndexedDB is significantly slower.
 */

import type {
  IndexedDBWorkerInboundMessage,
  IndexedDBWorkerOutboundMessage,
} from './indexedDB.worker'
import IndexedDBWorker from './indexedDB.worker?worker'

import { profiler } from '@/lib/performanceProfiler'

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  key: string
  type: 'read' | 'write'
  timeoutId: ReturnType<typeof setTimeout>
}

const OPERATION_TIMEOUT_MS = 10000

class WorkerStorage {
  private worker: Worker | null = null
  private pendingRequests: Map<number, PendingRequest> = new Map()
  private requestId = 0
  private initPromise: Promise<void> | null = null
  private profilingEnabled: boolean
  private keyLocks: Map<string, Promise<void>> = new Map()

  constructor(enableProfiling: boolean) {
    this.profilingEnabled = enableProfiling
  }

  private init(): Promise<void> {
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise<void>(resolve => {
      try {
        this.worker = new IndexedDBWorker()
        let resolved = false

        this.worker.onmessage = (event: MessageEvent<IndexedDBWorkerOutboundMessage>) => {
          if (event.data.type === 'ready' && !resolved) {
            resolved = true
            resolve()
            return
          }
          this.handleMessage(event)
        }

        this.worker.onerror = err => {
          console.error('[WorkerStorage] Worker error:', err)
        }

        this.worker.postMessage({ type: 'ping' })

        setTimeout(() => {
          if (!resolved) {
            resolved = true
            console.warn('[WorkerStorage] Worker ready timeout, continuing anyway')
            resolve()
          }
        }, 5000)
      } catch (err) {
        console.error('[WorkerStorage] Failed to create worker:', err)
        resolve()
      }
    })

    return this.initPromise
  }

  private handleMessage(event: MessageEvent<IndexedDBWorkerOutboundMessage>): void {
    const data = event.data
    if (data.type === 'ready') return

    const pending = this.pendingRequests.get(data.requestId)
    if (!pending) return

    clearTimeout(pending.timeoutId)
    this.pendingRequests.delete(data.requestId)

    if (data.type === 'error') {
      pending.reject(new Error(data.error))
      return
    }

    if (this.profilingEnabled && 'duration' in data) {
      profiler.trackIndexedDB(pending.type, data.duration, pending.key)
    }

    if (data.type === 'getItemResult') {
      pending.resolve(data.value)
    } else if (data.type === 'setItemResult') {
      pending.resolve(data.value)
    } else if (data.type === 'removeItemResult') {
      pending.resolve(undefined)
    }
  }

  private withKeyLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const lastOp = this.keyLocks.get(key) ?? Promise.resolve()
    const thisOp = lastOp.then(
      () => operation(),
      () => operation(),
    )
    this.keyLocks.set(
      key,
      thisOp.then(
        () => {},
        () => {},
      ),
    )
    return thisOp
  }

  private sendMessage(
    message: Exclude<IndexedDBWorkerInboundMessage, { type: 'ping' }>,
    key: string,
    type: 'read' | 'write',
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'))
        return
      }

      const timeoutId = setTimeout(() => {
        const pending = this.pendingRequests.get(message.requestId)
        if (pending) {
          this.pendingRequests.delete(message.requestId)
          pending.reject(new Error(`Operation timeout: ${key}`))
        }
      }, OPERATION_TIMEOUT_MS)

      this.pendingRequests.set(message.requestId, {
        resolve,
        reject,
        key,
        type,
        timeoutId,
      })
      this.worker.postMessage(message)
    })
  }

  async getItem<T>(key: string): Promise<T | null> {
    await this.init()

    if (!this.worker) {
      console.warn('[WorkerStorage] Worker not available, falling back to direct localforage')
      const localforage = await import('localforage')
      return localforage.default.getItem<T>(key)
    }

    const requestId = ++this.requestId
    const message: IndexedDBWorkerInboundMessage = {
      type: 'getItem',
      requestId,
      key,
    }
    const result = await this.sendMessage(message, key, 'read')
    return result as T | null
  }

  setItem<T>(key: string, value: T): Promise<T> {
    return this.withKeyLock(key, async () => {
      await this.init()

      if (!this.worker) {
        console.warn('[WorkerStorage] Worker not available, falling back to direct localforage')
        const localforage = await import('localforage')
        return localforage.default.setItem<T>(key, value)
      }

      const requestId = ++this.requestId
      const message: IndexedDBWorkerInboundMessage = {
        type: 'setItem',
        requestId,
        key,
        value,
      }
      await this.sendMessage(message, key, 'write')
      return value
    })
  }

  removeItem(key: string): Promise<void> {
    return this.withKeyLock(key, async () => {
      await this.init()

      if (!this.worker) {
        console.warn('[WorkerStorage] Worker not available, falling back to direct localforage')
        const localforage = await import('localforage')
        return localforage.default.removeItem(key)
      }

      const requestId = ++this.requestId
      const message: IndexedDBWorkerInboundMessage = {
        type: 'removeItem',
        requestId,
        key,
      }
      await this.sendMessage(message, key, 'write')
    })
  }
}

let workerStorageInstance: WorkerStorage | null = null

export const createWorkerStorage = (enableProfiling: boolean): WorkerStorage => {
  if (!workerStorageInstance) {
    workerStorageInstance = new WorkerStorage(enableProfiling)
  }
  return workerStorageInstance
}
