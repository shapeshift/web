import { ChainId as LifiChainId, ChainKey as LifiChainKey } from '@lifi/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import { createLifiChainMap } from './createLifiChainMap'

describe('createLifiChainMap', () => {
  it('handles empty dataset', () => {
    expect(createLifiChainMap([])).toEqual(new Map())
  })

  it('throws an error if an invalid chain id is passed', () => {
    const bogusLifiEvmChain = {
      key: 'mock key' as LifiChainKey,
      id: NaN, // an invalid chain id
    }

    expect(() => createLifiChainMap([bogusLifiEvmChain])).toThrowError('invalid chainId')
  })

  it('can create a map of LifiChainKey indexed by ChainId', () => {
    const ethLifiEvmChain = {
      key: LifiChainKey.ETH,
      id: LifiChainId.ETH,
    }

    const avaLifiEvmChain = {
      key: LifiChainKey.AVA,
      id: LifiChainId.AVA,
    }

    const optLifiEvmChain = {
      key: LifiChainKey.OPT,
      id: LifiChainId.OPT,
    }

    const basLifiEvmChain = {
      key: LifiChainKey.BAS,
      id: LifiChainId.BAS,
    }

    const expectation = new Map([
      [KnownChainIds.EthereumMainnet, ethLifiEvmChain.key],
      [KnownChainIds.OptimismMainnet, optLifiEvmChain.key],
      [KnownChainIds.AvalancheMainnet, avaLifiEvmChain.key],
      [KnownChainIds.BaseMainnet, basLifiEvmChain.key],
    ])

    const result = createLifiChainMap([
      ethLifiEvmChain,
      avaLifiEvmChain,
      optLifiEvmChain,
      basLifiEvmChain,
    ])

    expect(result).toEqual(expectation)
  })
})
