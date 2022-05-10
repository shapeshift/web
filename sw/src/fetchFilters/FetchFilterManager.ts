import type { Asyncify, SimpleRpcWrapper } from '../simpleRpc'
import { raceWithAbort } from '../simpleRpc/raceWithAbort'
import { SimpleRpc } from '../simpleRpc/SimpleRpc'
import { fetchWithFilters } from './fetchWithFilters'
import type { FetchFilter, FetchFilterInstance } from './types'

export type ExposedFetchFilterManager = Asyncify<
  Pick<
    FetchFilterManager,
    'ready' | 'isReady' | 'setReady' | 'installFilter' | 'addAllowedScope' | 'enforceAllowedScopes'
  >
>

export class FetchFilterManager {
  readonly #clients: Clients
  readonly #id: string
  readonly #readyTimeout: number
  readonly #readyResolver: () => void
  readonly #ready: Promise<void>
  #isReady = false
  #filterInitTimerStarted = false
  readonly #filters: Array<{ scope: RegExp; port: SimpleRpcWrapper<FetchFilter> }> = []
  readonly #allowedScopes: RegExp[] = []
  #allowedScopesEnforced = false
  #exposed = false
  #scrubbed = false
  readonly #bootstrapIntegrityValues: Set<string>

  constructor(
    clients: Clients,
    id: string,
    readyTimeout: number,
    bootstrapIntegrityValues: Iterable<string> = [],
  ) {
    this.#clients = clients
    this.#id = id
    this.#readyTimeout = readyTimeout
    this.#bootstrapIntegrityValues = new Set(bootstrapIntegrityValues)
    let readyResolver: () => void
    this.#ready = new Promise(resolve => (readyResolver = resolve))
    this.#readyResolver = readyResolver!
  }

  #urlWithinAllowedScope(url: string): boolean {
    if (!this.#allowedScopesEnforced) return true
    // If every allowed scope doesn't match the URL, reject it
    if (this.#allowedScopes.every(x => !x.test(url))) {
      return false
    }
    return true
  }

  ready(): Promise<void> {
    return this.#ready
  }

  isReady() {
    return this.#isReady
  }

  scrub() {
    if (!this.#scrubbed) {
      this.#scrubbed = true
      for (const { port } of this.#filters) {
        // This will typically fall back to port.close().
        SimpleRpc.close(port)
      }
    }
  }

  expose(): SimpleRpcWrapper<ExposedFetchFilterManager> {
    if (this.#exposed) {
      throw new Error('the FetchFilterManager for this client has already been created')
    }
    this.#exposed = true
    return SimpleRpc.wrap(this, [
      'ready',
      'isReady',
      'setReady',
      'installFilter',
      'addAllowedScope',
      'enforceAllowedScopes',
    ])
  }

  shouldBypassFilters(req: Request): boolean {
    if (this.#scrubbed) return false
    if (!this.#isReady) {
      // Before the filer manager is ready, we bypass filtering for bootstrap scripts. This is e.g. swStub.js,
      // which initializes a FilterManagerClient and calls setReady() on the manager.
      if (
        /^sha(256|384|512)-[A-Za-z0-9+/]{1,}={0,2}$/.test(req.integrity) &&
        this.#bootstrapIntegrityValues.has(req.integrity)
      ) {
        return true
      }
      return false
    }
    // All disallowed URLs must go through filtering so they can be rejected.
    if (!this.#urlWithinAllowedScope(req.url)) return false
    for (const filter of this.#filters) {
      if (filter.scope.test(req.url)) {
        return false
      }
    }
    return true
  }

  async fetchWithFilters(req: Request): Promise<Response> {
    if (this.#scrubbed) return Response.error()
    this.#requestFilterInit()
    await raceWithAbort(this.#ready, req.signal)
    if (!this.#urlWithinAllowedScope(req.url)) return Response.error()
    const filterPromises: Promise<SimpleRpcWrapper<FetchFilterInstance>>[] = []
    for (const filter of this.#filters) {
      if (filter.scope.test(req.url)) {
        filterPromises.push(SimpleRpc.call(filter.port, 'createFilterInstance', req.signal))
      }
    }
    const filters = await Promise.all(filterPromises)
    const out = await fetchWithFilters(req, filters)
    for (const filter of filters) {
      SimpleRpc.close(filter)
    }
    return out
  }

  async installFilter(scope: RegExp, port: SimpleRpcWrapper<FetchFilter>): Promise<void> {
    if (this.#scrubbed) throw new Error('scrubbed')
    if (!(scope instanceof RegExp)) throw new TypeError('scope must be a RegExp')
    if (!(port instanceof MessagePort)) throw new TypeError('port must be a MessagePort')
    console.info(`sw: FetchFilterManager(${this.#id}): installing filter for scope ${scope}`)
    this.#filters.push({
      scope,
      port,
    })
  }

  async setReady(): Promise<void> {
    if (this.#scrubbed) throw new Error('scrubbed')
    if (!this.#isReady) {
      console.info(`sw: FetchFilterManager(${this.#id}): ready`)
      this.#isReady = true
      this.#readyResolver()
    }
  }

  #requestFilterInit() {
    if (!this.#isReady && !this.#filterInitTimerStarted) {
      this.#filterInitTimerStarted = true
      this.#clients.get(this.#id).then(x => x?.postMessage({ method: 'initializeFetchFilters' }))
      setTimeout(() => {
        if (!this.#isReady && !this.#exposed && !this.#scrubbed) {
          console.info(
            `sw: FetchFilterManager(${this.#id}): timed out waiting for filter init, not enforcing`,
          )
          this.#isReady = true
          this.#readyResolver()
        }
      }, this.#readyTimeout)
    }
  }

  async addAllowedScope(scope: RegExp): Promise<void> {
    if (this.#scrubbed) throw new Error('scrubbed')
    if (!(scope instanceof RegExp)) throw new TypeError('scope must be a RegExp')
    if (this.#allowedScopesEnforced) {
      throw new Error("can't add new allowed scopes once in enforcing mode")
    }
    console.info(`sw: FetchFilterManager(${this.#id}): adding allowed scope ${scope}`)
    this.#allowedScopes.push(scope)
  }

  async enforceAllowedScopes(): Promise<void> {
    if (this.#scrubbed) throw new Error('scrubbed')
    console.info(`sw: FetchFilterManager(${this.#id}): enforcing allowed scopes`)
    this.#allowedScopesEnforced = true
  }
}
Object.freeze(FetchFilterManager)
Object.freeze(FetchFilterManager.prototype)
