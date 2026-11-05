import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { bscChainId, ethChainId, tonChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import { resolveSearchResults } from './resolveSearchResults'

const makeTestAsset = (
  assetId: AssetId,
  chainId: ChainId,
  symbol: string,
  relatedAssetKey?: AssetId,
): Asset => ({ assetId, chainId, symbol, relatedAssetKey }) as Asset

const TON_ID = 'ton:mainnet/slip44:607'
const TON = makeTestAsset(TON_ID, tonChainId, 'TON', TON_ID)
const GRAM_ETH = makeTestAsset('eip155:1/erc20:0xgram', ethChainId, 'GRAM', TON_ID)
const GRAM_BSC = makeTestAsset('eip155:56/erc20:0xgram', bscChainId, 'GRAM', TON_ID)
const GRAM_BSC_2 = makeTestAsset('eip155:56/erc20:0xgram2', bscChainId, 'GRAM', TON_ID)
const USDC = makeTestAsset('eip155:1/erc20:0xusdc', ethChainId, 'USDC')

const byId = (assets: Asset[]) => Object.fromEntries(assets.map(asset => [asset.assetId, asset]))

const baseArgs = {
  relatedAssetIdsByKey: {
    [TON_ID]: [TON_ID, GRAM_ETH.assetId, GRAM_BSC.assetId, GRAM_BSC_2.assetId],
    [USDC.assetId]: [USDC.assetId],
  },
  assetsById: byId([TON, GRAM_ETH, GRAM_BSC, GRAM_BSC_2, USDC]),
  activeChainId: 'All' as const,
  isAddressSearch: false,
}

describe('resolveSearchResults', () => {
  it('keeps usable results in their search order', () => {
    expect(
      resolveSearchResults({
        ...baseArgs,
        resultAssetIds: [TON_ID, USDC.assetId],
        usableAssetsById: byId([USDC, TON]),
      }),
    ).toEqual([TON, USDC])
  })

  it('swaps a result the list rejects for its one usable version, e.g. limit order buy', () => {
    expect(
      resolveSearchResults({
        ...baseArgs,
        resultAssetIds: [TON_ID, USDC.assetId],
        usableAssetsById: byId([USDC, GRAM_ETH]),
      }),
    ).toEqual([GRAM_ETH, USDC])
  })

  it('groups several usable versions under the family main asset, even when a version was the result', () => {
    expect(
      resolveSearchResults({
        ...baseArgs,
        resultAssetIds: [GRAM_BSC_2.assetId],
        usableAssetsById: byId([GRAM_ETH, GRAM_BSC]),
      }),
    ).toEqual([TON])
  })

  it('only swaps in versions on the network tab', () => {
    expect(
      resolveSearchResults({
        ...baseArgs,
        activeChainId: bscChainId,
        resultAssetIds: [GRAM_BSC_2.assetId],
        usableAssetsById: byId([TON, GRAM_ETH, GRAM_BSC]),
      }),
    ).toEqual([GRAM_BSC])
  })

  it('never swaps an address search for a token at another address', () => {
    expect(
      resolveSearchResults({
        ...baseArgs,
        isAddressSearch: true,
        resultAssetIds: [GRAM_BSC_2.assetId],
        usableAssetsById: byId([GRAM_ETH, GRAM_BSC]),
      }),
    ).toEqual([])
  })

  it('does not repeat a version that is also its own result', () => {
    expect(
      resolveSearchResults({
        ...baseArgs,
        resultAssetIds: [TON_ID, GRAM_ETH.assetId],
        usableAssetsById: byId([GRAM_ETH]),
      }),
    ).toEqual([GRAM_ETH])
  })

  it('drops a result with no usable version', () => {
    expect(
      resolveSearchResults({ ...baseArgs, resultAssetIds: [TON_ID], usableAssetsById: {} }),
    ).toEqual([])
  })
})
