/// <reference lib="WebWorker" />

import { raceWithAbort } from './raceWithAbort'
import type {
  Asyncify,
  ErrorHandler,
  Event,
  EventSource,
  MessageReceiver,
  Methods,
  SimpleRpcWrapper,
  SimpleRpcWrapperLike,
  SimpleRpcWrapperReturnType,
  SimpleRpcWrapperUnwrapped,
} from './types'

/**
 * SimpleRpc is a MessageChannel-based RPC mechanism intended for use primarily with structured data. It relies on the
 * fact that MessagePorts are themselves transferable via postMessage(), sending a MessagePort to the remote side to
 * serve as a callback channel instead of multiplexing requests and responses over a single channel.
 *
 * SimpleRpc is loosely inspired by JSON-RPC 1.0, but has several situationally-applicable advantages:
 * - Remote objects are represented as native MessagePort objects, rather than as SDK-specific wrappers
 * - No need to maintain the state needed to assign IDs to requests and dispatch associated responses
 * - Compatible code can have very compact implementations, especially when minimal functionality is required; for
 *   example, a simple one-shot, no-reply-needed call can be done manually in a single line of native code, no import
 *   required
 * - Exposed methods may be called by different clients without enabling them to see each others' calls or tamper with
 *   the responses
 *
 * Like JSON-RPC, methods are called by sending an object with 'method' and 'params' fields, and results come as objects
 * with either a 'result' or an 'error' field. Unlike JSON-RPC, however, there is no 'id' field on each message, and
 * requests and responses are not multiplexed on the same channel. Instead, results are delivered over a MessagePort
 * provided in the 'port' field of the representation of the method call.
 */
export class SimpleRpc<T extends Event> {
  readonly #methods: Methods<EventSource<T>>
  readonly #errorHandler: ErrorHandler
  readonly #exclusive: boolean
  #closeHandler: (() => void) | undefined

  static #wrappedRpcHandlers = new WeakMap<
    SimpleRpcWrapper<Record<string, (...args: any) => Promise<any>>>,
    SimpleRpc<Event>
  >()

  static #errorFromMessageErrorEvent(event: Event) {
    // Many browser implementations use null data for messageerror events.
    new Error(`messageerror event received${event.data ? `: ${event.data}` : ''}`)
  }

  /**
   * Calls a method on the remote object represented by the provided port, with static type hints to make things easier
   * to use.
   * @param port The port over which to make the method call. This will typically be a SimpleRpcWrapper-typed
   * MessagePort object obtained via SimpleRpc.wrap(), but can be any object which provides postMessage().
   * @param method Name of the method to call over the provided port.
   * @param signal An optional AbortSignal. Especially helpful when processing FetchEvents in ServiceWorkers.
   * @param params The parameters to pass to the called method.
   * @returns A Promise which will resolve when the response is received, or when the optional AbortSignal fires.
   */
  static async call<
    T extends SimpleRpcWrapperLike<any>,
    U extends keyof SimpleRpcWrapperUnwrapped<T>,
  >(
    port: T,
    method: U,
    signal?: AbortSignal,
    ...params: Parameters<SimpleRpcWrapperUnwrapped<T>[U]>
  ): Promise<SimpleRpcWrapperReturnType<T, U>> {
    const { port1, port2 } = new MessageChannel()
    const remoteResult = new Promise<SimpleRpcWrapperReturnType<T, U>>((resolve, reject) => {
      port2.addEventListener('message', ev => {
        // Errors take precedence, but JSON-RPC 1.0 allows an explicit null here and we follow that pattern.
        if ((ev.data.error ?? null) !== null) {
          reject(new Error(String(ev.data.error)))
        } else {
          resolve(ev.data.result)
        }
      })
      port2.addEventListener('messageerror', ev => {
        reject(SimpleRpc.#errorFromMessageErrorEvent(ev))
      })
    })
    // Closing the local port of the MessageChannel allows immediate reclamation of its resources, rather than requiring
    // a full GC cycle.
    const result = raceWithAbort(remoteResult, signal).finally(() => port2.close())
    port2.start()
    port.postMessage(
      {
        method,
        params,
        port: port1,
      },
      {
        transfer: [
          port1,
          ...(params.filter(
            // TODO: It's possible that this parameter transfer logic won't be appropriate in every instance, but
            // improving on it would probably require making calls less ergonomic.
            x => x instanceof MessagePort || x instanceof ArrayBuffer,
          ) as Transferable[]),
        ],
      },
    )
    return await result
  }

  /**
   * Creates a MessagePort which exposes some of the methods on an object.
   * @param obj An object to expose methods from. Remote message calls will use this object as their `this` value.
   * @param methodsToExpose An optional list of methods to expose; if not provided, all methods will be exposed.
   * @param errorHandler An optional error handler for internal RPC errors. Defaults to console.error().
   * @returns A MessagePort exposing the object, with some extra static type information sprinkled on top.
   */
  static wrap<T extends Record<U, (...args: any) => any>, U extends keyof T>(
    obj: T,
    methodsToExpose?: U[],
    errorHandler: ErrorHandler = e => console.error(e),
  ): SimpleRpcWrapper<Asyncify<Pick<T, U>>> {
    const { port1, port2 } = new MessageChannel()
    // This captures all enumerable function-valued properties of the object, even inherited onces.
    methodsToExpose ??= Array.from(
      (function* () {
        for (const k in obj) {
          if (typeof obj[k] === 'function') yield k
        }
      })(),
    ) as any[]
    const methods = Object.fromEntries(methodsToExpose!.map(x => [x, obj[x].bind(obj)]))
    // This WeakMap allows us to close() the server instance without making the user keep track of it.
    SimpleRpc.#wrappedRpcHandlers.set(port1, new SimpleRpc(methods, port2, true, errorHandler))
    port2.start()
    return port1
  }

  /**
   * Closes both a MessagePort from SimpleRpc.wrap() and its assocated RPC server. This is not strictly needed, since GC
   * will collect unused ports, but it's resource-intensive to determine that entangled pairs of ports aren't accessible
   * from any of the JS contexts they may be shared with. Proper port hygiene helps keep memory pressure down, and is
   * especially important since SimpleRpc relies on creating lots of pairs of entangled ports.
   */
  static close<T extends SimpleRpcWrapper<any>>(port: T) {
    SimpleRpc.#wrappedRpcHandlers.get(port)?.close()
    port.close()
  }

  /**
   * Most usecases will want SimpleRpc.wrap() instead, but constructing a custom RPC server can be more powerful.
   * @param methods An object containing the method handlers to serve. Unlike SimpleRpc.wrap(), these methods are not
   * bound; instead, their `this` value has access to a HandlerContext.
   * @param receiver An object capable of having 'message' event listeners attached. Usually a MessagePort, but can be
   * any object providing this interface; for example, a Window or a WorkerGlobalScope.
   * @param exclusive If set, the server will handle 'messageerror' events and issue 'method not found' errors. Leaving
   * this off can be useful to allow multiple servers to expose different methods on a single MessageReceiver.
   * @param errorHandler An optional error handler for internal RPC errors. Defaults to console.error().
   */
  constructor(
    methods: Methods<EventSource<T>>,
    receiver: MessageReceiver<T>,
    exclusive: boolean = false,
    errorHandler: ErrorHandler = e => console.error(e),
  ) {
    this.#methods = methods
    this.#exclusive = exclusive
    this.#errorHandler = errorHandler
    // Add message listener
    const messageListener = (ev: T) => {
      if (this.closed) return
      const handlerComplete = this.#handleEvent(ev)
      if ('waitUntil' in ev) ev.waitUntil?.(handlerComplete)
    }
    receiver.addEventListener('message', messageListener)
    // Add messageerror listener
    const messageErrorListener = this.#exclusive
      ? (ev: T) => {
          if (this.closed) return
          this.#errorHandler(SimpleRpc.#errorFromMessageErrorEvent(ev))
        }
      : undefined
    if (messageErrorListener) receiver.addEventListener('messageerror', messageErrorListener)
    // Set close handler
    this.#closeHandler = () => {
      receiver.removeEventListener?.('message', messageListener)
      if (messageErrorListener) {
        receiver.removeEventListener?.('messageerror', messageErrorListener)
      }
    }
  }

  /**
   * Closes the server and detaches its event listeners.
   */
  close() {
    this.#closeHandler?.()
    this.#closeHandler = undefined
  }

  get closed() {
    return !this.#closeHandler
  }

  #handleEvent(event: Event): Promise<void> {
    // This is not implemented as an async method, which ensures that stray awaits won't prevent
    // event.stopImmediatePropagation() from occurring synchronously when it's needed.
    const { method, params, port }: { method: string; params: unknown[]; port: MessagePort } =
      event.data
    if (
      typeof method !== 'string' &&
      ((params ?? undefined) === undefined || Array.isArray(params)) &&
      ((port ?? undefined) === undefined || port instanceof MessagePort)
    ) {
      return Promise.resolve()
    }
    const handler = this.#methods[method]
    if (handler) {
      event.stopImmediatePropagation()
      const options = { transfer: [] as Transferable[] }
      // Async IIFE translates any synchronous throw from the handler to a rejected Promise
      return (async () =>
        handler.apply(
          {
            source: event.source,
            transfer(x) {
              options.transfer.push(x)
              return x
            },
          },
          params,
        ))()
        .then(result => {
          // JSON-RPC 1.0 uses null for void or undefined results, and we follow that pattern here.
          result ??= null
          if (
            (result instanceof MessagePort || result instanceof ArrayBuffer) &&
            !options.transfer.includes(result)
          ) {
            options.transfer.push(result)
          }
          port?.postMessage({ result }, options)
        })
        .catch(e => {
          if (port) {
            port.postMessage({ error: String(e) })
          } else {
            this.#errorHandler(e)
          }
        })
        .finally(() => port?.close())
    } else if (this.#exclusive) {
      event.stopImmediatePropagation()
      port?.postMessage({
        error: `method '${method}' not found`,
      })
    }
    return Promise.resolve()
  }
}
Object.freeze(SimpleRpc)
Object.freeze(SimpleRpc.prototype)
