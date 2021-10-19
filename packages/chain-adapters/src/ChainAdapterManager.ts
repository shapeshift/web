import { ChainTypes } from '@shapeshiftoss/types'
import { bitcoin, ethereum } from '@shapeshiftoss/unchained-client'
import { ChainAdapter } from './api'
import { BitcoinChainAdapter } from './bitcoin'
import { EthereumChainAdapter } from './ethereum'

export type UnchainedUrls = Partial<Record<ChainTypes, string>>

export class ChainAdapterManager {
  private supported: Map<ChainTypes, () => ChainAdapter<ChainTypes>> = new Map()
  private instances: Map<ChainTypes, ChainAdapter<ChainTypes>> = new Map()

  constructor(unchainedUrls: UnchainedUrls) {
    if (!unchainedUrls) {
      throw new Error('Blockchain urls required')
    }
    ;(Object.entries(unchainedUrls) as Array<[keyof UnchainedUrls, string]>).forEach(
      ([type, basePath]) => {
        switch (type) {
          case ChainTypes.Ethereum: {
            const provider = new ethereum.api.V1Api(new ethereum.api.Configuration({ basePath }))
            return this.addChain(type, () => new EthereumChainAdapter({ provider }))
          }
          case ChainTypes.Bitcoin: {
            const coinName = 'Bitcoin'
            const provider = new bitcoin.api.V1Api(new bitcoin.api.Configuration({ basePath }))
            return this.addChain(type, () => new BitcoinChainAdapter({ provider, coinName }))
          }
          default:
            throw new Error(`ChainAdapterManager: cannot instantiate ${type} chain adapter`)
        }
      }
    )
  }

  /**
   * Add support for a network by providing a class that implements ChainAdapter
   *
   * @example
   * import { ChainAdapterManager, UtxoChainAdapter } from 'chain-adapters'
   * const manager = new ChainAdapterManager(client)
   * manager.addChain('bitcoin', () => new UtxoChainAdapter('BTG', client))
   * @param {ChainTypes} network - Coin/network symbol from Asset query
   * @param {Function} factory - A function that returns a ChainAdapter instance
   */
  addChain<T extends ChainTypes>(chain: T, factory: () => ChainAdapter<ChainTypes>): void {
    if (typeof chain !== 'string' || typeof factory !== 'function') {
      throw new Error('Parameter validation error')
    }
    this.supported.set(chain, factory)
  }

  getSupportedChains(): Array<ChainTypes> {
    return Array.from(this.supported.keys())
  }

  getSupportedAdapters(): Array<() => ChainAdapter<ChainTypes>> {
    return Array.from(this.supported.values())
  }

  /*** Get a ChainAdapter instance for a network */
  byChain<T extends ChainTypes>(chain: T): ChainAdapter<T> {
    let adapter = this.instances.get(chain)
    if (!adapter) {
      const factory = this.supported.get(chain)
      if (factory) {
        adapter = factory()
        if (!adapter) {
          throw new Error(`Adapter not available for [${chain}]`)
        }
        this.instances.set(chain, adapter)
      }
    }

    if (!adapter) {
      throw new Error(`Network [${chain}] is not supported`)
    }

    return adapter as ChainAdapter<T>
  }
}
