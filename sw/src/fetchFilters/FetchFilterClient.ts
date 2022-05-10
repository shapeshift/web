import {
  type MessageReceiver,
  type SimpleRpcWrapper,
  type SimpleRpcWrapperLike,
  SimpleRpc,
} from '../simpleRpc'
import type { RpcMethods } from '../sw'
import type { ExposedFetchFilterManager } from './FetchFilterManager'
import type {
  FetchFilterInstance,
  RequestData,
  RequestOverrides,
  ResponseData,
  ResponseOverrides,
} from './types'

export type FetchFilterInitializer = (
  manager: SimpleRpcWrapper<ExposedFetchFilterManager>,
) => Promise<void>

export abstract class FetchFilterBase implements FetchFilterInstance {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async filterRequest(_reqData: RequestData): Promise<RequestOverrides | boolean> {
    return true
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async filterRequestBody(body: ArrayBuffer): Promise<ArrayBuffer | false> {
    return body
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async filterResponse(_resData: ResponseData): Promise<ResponseOverrides | boolean> {
    return true
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async filterResponseBody(body: ArrayBuffer): Promise<ArrayBuffer | false> {
    return body
  }
}
Object.freeze(FetchFilterBase)
Object.freeze(FetchFilterBase.prototype)

export type FetchFilterClass = { scope: RegExp; new (): FetchFilterBase }

export class FetchFilterClient {
  static readonly FetchFilterBase = FetchFilterBase

  static #active = (async () => {
    const target = (await navigator.serviceWorker?.ready)?.active
    if (!target) throw new Error('no active ServiceWorker detected')
    const out = new FetchFilterClient(
      target as SimpleRpcWrapperLike<RpcMethods> & MessageReceiver<MessageEvent>,
    )
    await out.#initializeFetchFilters()
    return Object.freeze(out)
  })()

  static get active() {
    return FetchFilterClient.#active
  }

  #managerResolving = false
  #managerResolved = false
  #managerResolver: (x: SimpleRpcWrapper<ExposedFetchFilterManager>) => void
  #manager: Promise<SimpleRpcWrapper<ExposedFetchFilterManager>>
  readonly #target: SimpleRpcWrapperLike<RpcMethods> & MessageReceiver<MessageEvent>
  readonly #initializers: FetchFilterInitializer[] = []
  // @ts-expect-error
  readonly #listener: SimpleRpc

  #setNewManager(manager: Promise<SimpleRpcWrapper<ExposedFetchFilterManager>>) {
    if (!this.#managerResolving) {
      this.#managerResolving = true
      manager.then(x => this.#managerResolver(x))
    } else {
      this.#manager = manager
    }
    this.#manager.then(() => (this.#managerResolved = true))
  }

  get ready(): Promise<void> {
    return this.#manager.then(x => SimpleRpc.call(x, 'ready'))
  }

  constructor(target: SimpleRpcWrapperLike<RpcMethods> & MessageReceiver<MessageEvent>) {
    let managerResolver: (x: SimpleRpcWrapper<ExposedFetchFilterManager>) => void
    this.#manager = new Promise(resolve => (managerResolver = resolve))
    this.#managerResolver = managerResolver!
    this.#target = target
    this.#listener = new SimpleRpc(
      {
        initializeFetchFilters: this.#initializeFetchFilters.bind(this),
      },
      this.#target,
      false,
    )
  }

  async #initializeFetchFilters() {
    this.#setNewManager(SimpleRpc.call(this.#target, 'exposeFetchFilterManager'))
    const manager = await this.#manager
    for (const initializer of this.#initializers) {
      await initializer(manager)
    }
    await SimpleRpc.call(manager, 'setReady')
  }

  async addInitializer(initializer: FetchFilterInitializer) {
    this.#initializers.push(initializer)
    // If the manager has not yet been resolved, the initalizer will be run by #initializeFetchFilters when it is.
    if (this.#managerResolved) {
      await initializer(await this.#manager)
    }
  }

  async installFilter(filterClass: FetchFilterClass) {
    await this.addInitializer(async manager => {
      await SimpleRpc.call(
        manager,
        'installFilter',
        undefined,
        filterClass.scope,
        await SimpleRpc.wrap({
          async createFilterInstance() {
            return SimpleRpc.wrap(new filterClass(), [
              'filterRequest',
              'filterRequestBody',
              'filterResponse',
              'filterResponseBody',
            ])
          },
        }),
      )
    })
  }

  async setAllowedScopes(scopes: Iterable<RegExp> | AsyncIterable<RegExp>) {
    await this.addInitializer(async manager => {
      for await (const scope of scopes) {
        await SimpleRpc.call(manager, 'addAllowedScope', undefined, scope)
      }
      await SimpleRpc.call(manager, 'enforceAllowedScopes')
    })
  }
}
Object.freeze(FetchFilterClient)
Object.freeze(FetchFilterClient.prototype)
