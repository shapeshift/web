import './messagePort'
import './transferHandlers'

import * as comlink from 'comlink'

export { wrap } from 'comlink'

// This detects if we're in a worker or not. (If not, we're probably under test.)
// If we're in a worker, comlink will handle getting finding proper endpoint itself,
// and `comlink.expose(foo, undefined)` is good enough; if not, though, we create
// our own MessageChannel and pretend that we are.
const isWorker =
  'DedicatedWorkerGlobalScope' in globalThis &&
  globalThis instanceof (globalThis as Record<string, any>)['DedicatedWorkerGlobalScope']
const { port1, port2 } = isWorker ? { port1: undefined, port2: undefined } : new MessageChannel()

// This must be a default export, and its type is crafted to match the interface
// which will be provided by `worker-loader` to a worker's launching module.
// eslint-disable-next-line import/no-default-export
export function expose<T>(x: T) {
  comlink.expose(x, port1)
  return class {
    constructor() {
      return port2 as Omit<Worker, 'terminate' | 'onerror'>
    }
  } as { new (): Omit<Worker, 'terminate' | 'onerror'> }
}
