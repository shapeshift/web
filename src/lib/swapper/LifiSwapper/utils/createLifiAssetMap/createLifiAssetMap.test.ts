import type { Token as LifiToken } from '@lifi/sdk'
import { ChainId as LifiChainId } from '@lifi/types'
import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, ASSET_REFERENCE } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

import { DEFAULT_LIFI_TOKEN_ADDRESS } from '../constants'
import { createLifiAssetMap } from './createLifiAssetMap'

describe('createLifiAssetMap', () => {
  it('handles empty dataset', () => {
    expect(createLifiAssetMap([])).toEqual(new Map())
  })

  it('can create a map of erc20 tokens indexed by AssetId', () => {
    const usdcTokenAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    const optTokenAddress = '0x4200000000000000000000000000000000000042'
    const maticTokenAddress = '0xa56b1b9f4e5a1a1e0868f5fd4352ce7cdf0c2a4f'
    const usdcAssetId: AssetId = `${KnownChainIds.EthereumMainnet}/${ASSET_NAMESPACE.erc20}:${usdcTokenAddress}`
    const optAssetId: AssetId = `${KnownChainIds.OptimismMainnet}/${ASSET_NAMESPACE.erc20}:${optTokenAddress}`
    const maticAssetId: AssetId = `${KnownChainIds.AvalancheMainnet}/${ASSET_NAMESPACE.erc20}:${maticTokenAddress}`

    const usdcLifiToken: LifiToken = {
      address: usdcTokenAddress,
      symbol: 'USDC',
      decimals: 6,
      chainId: LifiChainId.ETH,
      name: 'USD Coin',
    }

    const optLifiToken: LifiToken = {
      address: optTokenAddress,
      symbol: 'OP',
      decimals: 18,
      chainId: LifiChainId.OPT,
      name: 'Optimism',
    }

    const maticLifiToken: LifiToken = {
      address: maticTokenAddress,
      symbol: 'MATIC',
      decimals: 19,
      chainId: LifiChainId.AVA,
      name: 'Matic',
    }

    const expectation = new Map([
      [usdcAssetId, usdcLifiToken],
      [optAssetId, optLifiToken],
      [maticAssetId, maticLifiToken],
    ])

    const result = createLifiAssetMap([usdcLifiToken, optLifiToken, maticLifiToken])

    expect(result).toEqual(expectation)
  })

  it('can correctly process native assets', () => {
    const nativeEthAssetId: AssetId = `${KnownChainIds.EthereumMainnet}/${ASSET_NAMESPACE.slip44}:${ASSET_REFERENCE.Ethereum}`
    const nativeOptimismAssetId: AssetId = `${KnownChainIds.OptimismMainnet}/${ASSET_NAMESPACE.slip44}:${ASSET_REFERENCE.Optimism}`
    const nativeAvalancheAssetId: AssetId = `${KnownChainIds.AvalancheMainnet}/${ASSET_NAMESPACE.slip44}:${ASSET_REFERENCE.AvalancheC}`

    const nativeEthLifiToken: LifiToken = {
      address: DEFAULT_LIFI_TOKEN_ADDRESS,
      symbol: 'ETH',
      decimals: 18,
      chainId: LifiChainId.ETH,
      name: 'Ethereum',
    }

    const nativeOptimismLifiToken: LifiToken = {
      address: DEFAULT_LIFI_TOKEN_ADDRESS,
      symbol: 'ETH',
      decimals: 18,
      chainId: LifiChainId.OPT,
      name: 'Ethereum',
    }

    const nativeAvalancheLifiToken: LifiToken = {
      address: DEFAULT_LIFI_TOKEN_ADDRESS,
      symbol: 'AVAX',
      decimals: 18,
      chainId: LifiChainId.AVA,
      name: 'Avalanche',
    }

    const expectation = new Map([
      [nativeEthAssetId, nativeEthLifiToken],
      [nativeOptimismAssetId, nativeOptimismLifiToken],
      [nativeAvalancheAssetId, nativeAvalancheLifiToken],
    ])

    const result = createLifiAssetMap([
      nativeEthLifiToken,
      nativeOptimismLifiToken,
      nativeAvalancheLifiToken,
    ])

    expect(result).toEqual(expectation)
  })
})
