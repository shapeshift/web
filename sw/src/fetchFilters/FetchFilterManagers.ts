/// <reference lib="WebWorker" />

import { FetchFilterManager } from './FetchFilterManager'

export class FetchFilterManagers extends Map<string, FetchFilterManager> {
  readonly #clients: Clients
  readonly #readyTimeout: number
  readonly #bootstrapIntegrityValues: Array<string>

  constructor(clients: Clients, readyTimeout: number, bootstrapIntegrityValues: Iterable<string>) {
    super()
    this.#clients = clients
    this.#readyTimeout = readyTimeout
    this.#bootstrapIntegrityValues = Array.from(bootstrapIntegrityValues)
  }

  async scrub() {
    return (
      await Promise.all(
        Array.from(this.entries()).map(async ([k, v]) => {
          return [k, v, !!(await this.#clients.get(k))] as const
        }),
      )
    )
      .filter(([, , x]) => x)
      .map(([k, v]) => [k, v] as const)
      .forEach(([k, v]) => {
        console.info(`sw: FetchFilterManagers: dropping filter manager for missing client ${k}`)
        this.delete(k)
        v.scrub()
      })
  }

  get(id: string) {
    return (
      super.get(id) ??
      (() => {
        const out = new FetchFilterManager(
          this.#clients,
          id,
          this.#readyTimeout,
          this.#bootstrapIntegrityValues,
        )
        this.set(id, out)
        return out
      })()
    )
  }
}
Object.freeze(FetchFilterManagers)
Object.freeze(FetchFilterManagers.prototype)
