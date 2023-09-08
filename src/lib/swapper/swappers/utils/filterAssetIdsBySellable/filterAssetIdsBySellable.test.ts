import type { AssetId } from '@shapeshiftoss/caip'
import {
  avalancheAssetId,
  btcAssetId,
  ethAssetId,
  optimismAssetId,
  thorchainAssetId,
} from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Asset } from 'lib/asset-service'

import { filterEvmAssetIdsBySellable } from './filterAssetIdsBySellable'

const testAssetId1: AssetId = ethAssetId
const testAssetId2: AssetId = avalancheAssetId
const testAssetId3: AssetId = optimismAssetId
const testAssetId4: AssetId = thorchainAssetId
const testAssetId5: AssetId = btcAssetId

describe('filterEvmAssetIdsBySellable', () => {
  const assets = {
    [testAssetId1]: {
      chainId: KnownChainIds.EthereumMainnet,
    },
    [testAssetId2]: {
      chainId: KnownChainIds.AvalancheMainnet,
    },
    /*
      for the sake of this test suite, make testAssetId3 not supported on our side
      [testAssetId3]: {
        chainId: KnownChainIds.OptimismMainnet,
      },
    */
    [testAssetId4]: {
      chainId: KnownChainIds.ThorchainMainnet,
    },
    [testAssetId5]: {
      chainId: KnownChainIds.BitcoinMainnet,
    },
  } as Record<AssetId, Asset>

  test('only includes EVM assets', () => {
    const assets = {
      [testAssetId1]: {
        chainId: KnownChainIds.EthereumMainnet,
      },
      [testAssetId2]: {
        chainId: KnownChainIds.AvalancheMainnet,
      },
      [testAssetId3]: {
        chainId: KnownChainIds.OptimismMainnet,
      },
      [testAssetId4]: {
        chainId: KnownChainIds.ThorchainMainnet,
      },
      [testAssetId5]: {
        chainId: KnownChainIds.BitcoinMainnet,
      },
    } as Record<AssetId, Asset>

    const result = filterEvmAssetIdsBySellable(Object.values(assets))

    const expectation = [assets[testAssetId1], assets[testAssetId2], assets[testAssetId3]]
    expect(result).toEqual(expectation)
  })

  test('returns empty array when no sellable assetIds are provided', () => {
    const inputAssets = [assets[testAssetId4], assets[testAssetId5]]
    const result = filterEvmAssetIdsBySellable(inputAssets)

    const expectation: AssetId[] = []
    expect(result).toEqual(expectation)
  })

  test('returns empty array when assetIds is an empty array', () => {
    const inputAssetIds: Asset[] = []
    const result = filterEvmAssetIdsBySellable(inputAssetIds)

    const expectation: AssetId[] = []
    expect(result).toEqual(expectation)
  })
})
