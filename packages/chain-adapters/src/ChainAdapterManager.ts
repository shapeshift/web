import { ChainAdapter, ChainIdentifier } from './api'
import { EthereumChainAdapter } from './ethereum'
import { UnchainedProvider } from './providers'

export type UnchainedUrls = Record<ChainIdentifier.Ethereum, string>

const chainAdapterMap = {
  [ChainIdentifier.Ethereum]: EthereumChainAdapter
} as const

export class ChainAdapterManager {
  private supported: Map<ChainIdentifier, () => ChainAdapter> = new Map()
  private instances: Map<string, ChainAdapter> = new Map()

  constructor(unchainedUrls: UnchainedUrls) {
    if (!unchainedUrls) {
      throw new Error('Blockchain urls required')
    }
    ;(Object.keys(unchainedUrls) as Array<ChainIdentifier>).forEach((key: ChainIdentifier) => {
      const Adapter = chainAdapterMap[key]
      if (!Adapter) throw new Error(`No chain adapter for ${key}`)
      this.addChain(key, () => new Adapter({ provider: new UnchainedProvider(unchainedUrls[key]) }))
    })
  }

  /**
   * Add support for a network by providing a class that implements ChainAdapter
   *
   * @example
   * import { ChainAdapterManager, UtxoChainAdapter } from 'chain-adapters'
   * const manager = new ChainAdapterManager(client)
   * manager.addChain('bitcoin', () => new UtxoChainAdapter('BTG', client))
   * @param {ChainIdentifier} network - Coin/network symbol from Asset query
   * @param {Function} factory - A function that returns a ChainAdapter instance
   */
  addChain(chain: ChainIdentifier, factory: () => ChainAdapter): void {
    if (typeof chain !== 'string' || typeof factory !== 'function') {
      throw new Error('Parameter validation error')
    }
    this.supported.set(chain, factory)
  }

  getSupportedChains(): Array<ChainIdentifier> {
    return Array.from(this.supported.keys())
  }

  getSupportedAdapters(): Array<() => ChainAdapter> {
    return Array.from(this.supported.values())
  }

  /*** Get a ChainAdapter instance for a network */
  byChain(chain: ChainIdentifier): ChainAdapter {
    let adapter = this.instances.get(chain)
    if (!adapter) {
      const factory = this.supported.get(chain)
      if (factory) {
        this.instances.set(chain, factory())
        adapter = this.instances.get(chain)
      }
    }

    if (!adapter) {
      throw new Error(`Network [${chain}] is not supported`)
    }

    return adapter
  }
}
