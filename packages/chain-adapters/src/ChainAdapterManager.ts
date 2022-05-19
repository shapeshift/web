import { ChainId, isChainId } from '@shapeshiftoss/caip'
import { ChainTypes } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ChainAdapter } from './api'
import * as bitcoin from './bitcoin'
import * as cosmos from './cosmossdk/cosmos'
import * as osmosis from './cosmossdk/osmosis'
import * as ethereum from './ethereum'

export type UnchainedUrl = {
  httpUrl: string
  wsUrl: string
}
export type UnchainedUrls = Partial<Record<ChainTypes, UnchainedUrl>>

export class ChainAdapterManager {
  private supported: Map<ChainTypes, () => ChainAdapter<ChainTypes>> = new Map()
  private instances: Map<ChainTypes, ChainAdapter<ChainTypes>> = new Map()

  constructor(unchainedUrls: UnchainedUrls) {
    if (!unchainedUrls) {
      throw new Error('Blockchain urls required')
    }
    ;(Object.entries(unchainedUrls) as Array<[keyof UnchainedUrls, UnchainedUrl]>).forEach(
      ([type, { httpUrl, wsUrl }]) => {
        switch (type) {
          case ChainTypes.Ethereum: {
            const http = new unchained.ethereum.V1Api(
              new unchained.ethereum.Configuration({ basePath: httpUrl })
            )
            const ws = new unchained.ws.Client<unchained.ethereum.ParsedTx>(wsUrl)
            return this.addChain(type, () => new ethereum.ChainAdapter({ providers: { http, ws } }))
          }
          case ChainTypes.Bitcoin: {
            const http = new unchained.bitcoin.V1Api(
              new unchained.bitcoin.Configuration({ basePath: httpUrl })
            )
            const ws = new unchained.ws.Client<unchained.Tx>(wsUrl)
            return this.addChain(
              type,
              () => new bitcoin.ChainAdapter({ providers: { http, ws }, coinName: 'Bitcoin' })
            )
          }

          case ChainTypes.Cosmos: {
            const http = new unchained.cosmos.V1Api(
              new unchained.cosmos.Configuration({ basePath: httpUrl })
            )
            const ws = new unchained.ws.Client<unchained.cosmos.Tx>(wsUrl)
            return this.addChain(
              type,
              () => new cosmos.ChainAdapter({ providers: { http, ws }, coinName: 'Cosmos' })
            )
          }

          case ChainTypes.Osmosis: {
            const http = new unchained.osmosis.V1Api(
              new unchained.osmosis.Configuration({ basePath: httpUrl })
            )
            const ws = new unchained.ws.Client<unchained.osmosis.Tx>(wsUrl)
            return this.addChain(
              type,
              () => new osmosis.ChainAdapter({ providers: { http, ws }, coinName: 'Osmosis' })
            )
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
   * @param {ChainTypes} chain - Coin/network symbol from Asset query
   * @param {Function} factory - A function that returns a ChainAdapter instance
   */
  addChain<T extends ChainTypes>(chain: T, factory: () => ChainAdapter<ChainTypes>): void {
    if (typeof chain !== 'string' || typeof factory !== 'function') {
      throw new Error('Parameter validation error')
    }
    this.supported.set(chain, factory)
  }

  removeChain<T extends ChainTypes>(chain: T): void {
    if (!Object.values(ChainTypes).includes(chain)) {
      throw new Error(`ChainAdapterManager: invalid chain ${chain}`)
    }
    if (!this.supported.has(chain)) {
      throw new Error(`ChainAdapterManager: chain ${chain} not registered`)
    }
    this.supported.delete(chain)
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

  byChainId(chainId: ChainId) {
    // this function acts like a validation function and throws if the check doesn't pass
    isChainId(chainId)

    for (const [chain] of this.supported) {
      // byChain calls the factory function so we need to call it to create the instances
      const adapter = this.byChain(chain)
      if (adapter.getChainId() === chainId) return adapter
    }

    throw new Error(`Chain [${chainId}] is not supported`)
  }
}
