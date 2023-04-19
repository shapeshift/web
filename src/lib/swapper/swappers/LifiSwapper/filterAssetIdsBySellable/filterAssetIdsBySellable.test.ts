import type { Token as LifiToken } from '@lifi/sdk'
import { ChainId as LifiChainId } from '@lifi/types'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as selectors from 'state/slices/assetsSlice/selectors'

import { filterAssetIdsBySellable } from './filterAssetIdsBySellable'

const testAssetId1: AssetId = 'ethereum:erc20:0x1'
const testAssetId2: AssetId = 'ethereum:erc20:0x2'
const testAssetId3: AssetId = 'ethereum:erc20:0x3'
const testAssetId4: AssetId = 'cosmos:native:0x4'
const testAssetId5: AssetId = 'cosmos:native:0x5'

const testLifiToken1: LifiToken = {
  address: '0x1',
  symbol: 'TKN1',
  decimals: 18,
  chainId: LifiChainId.ETH,
  name: 'Token 1',
  priceUSD: '12.34',
}

const testLifiToken2: LifiToken = {
  address: '0x2',
  symbol: 'TKN2',
  decimals: 18,
  chainId: LifiChainId.AVA,
  name: 'Token 2',
  priceUSD: '23.45',
}

const testLifiToken3: LifiToken = {
  address: '0x2',
  symbol: 'TKN2',
  decimals: 18,
  chainId: LifiChainId.AVA,
  name: 'Token 2',
  priceUSD: '23.45',
}

const lifiTokenMap = new Map<AssetId, LifiToken>([
  [testAssetId1, testLifiToken1],
  [testAssetId2, testLifiToken2],
  [testAssetId3, testLifiToken3],
])

const selectAssetsSpy = jest.spyOn(selectors, 'selectAssets')

describe('filterAssetIdsBySellable', () => {
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
        chainId: KnownChainIds.AvalancheMainnet,
      },
    */
    [testAssetId4]: {
      chainId: KnownChainIds.ThorchainMainnet,
    },
    [testAssetId5]: {
      chainId: KnownChainIds.BitcoinMainnet,
    },
  } as Record<ChainId, Asset>

  beforeEach(() => {
    selectAssetsSpy.mockImplementation(() => assets)
  })

  afterEach(() => {
    selectAssetsSpy.mockClear()
  })

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
    } as Record<ChainId, Asset>

    selectAssetsSpy.mockImplementation(() => assets)

    const inputAssetIds = [testAssetId1, testAssetId2, testAssetId3, testAssetId4, testAssetId5]
    const result = filterAssetIdsBySellable(inputAssetIds, lifiTokenMap)

    const expectation = [testAssetId1, testAssetId2, testAssetId3]
    expect(result).toEqual(expectation)
  })

  test('excludes EVM assets not supported on our side', () => {
    const assets = {
      [testAssetId1]: {
        chainId: KnownChainIds.EthereumMainnet,
      },
      [testAssetId2]: {
        chainId: KnownChainIds.AvalancheMainnet,
      },
      /*
        for the sake of this test, make testAssetId3 not supported on our side
        [testAssetId3]: {
          chainId: KnownChainIds.AvalancheMainnet,
        },
      */
    } as Record<ChainId, Asset>

    selectAssetsSpy.mockImplementation(() => assets)

    const inputAssetIds = [testAssetId1, testAssetId2, testAssetId3]
    const result = filterAssetIdsBySellable(inputAssetIds, lifiTokenMap)

    const expectation = [testAssetId1, testAssetId2]
    expect(result).toEqual(expectation)
  })

  test('returns empty array when no sellable assetIds are provided', () => {
    const inputAssetIds = [testAssetId3, testAssetId4]
    const result = filterAssetIdsBySellable(inputAssetIds, lifiTokenMap)

    const expectation: AssetId[] = []
    expect(result).toEqual(expectation)
  })

  test('returns empty array when assetIds is an empty array', () => {
    const inputAssetIds: AssetId[] = []
    const result = filterAssetIdsBySellable(inputAssetIds, lifiTokenMap)

    const expectation: AssetId[] = []
    expect(result).toEqual(expectation)
  })
})
