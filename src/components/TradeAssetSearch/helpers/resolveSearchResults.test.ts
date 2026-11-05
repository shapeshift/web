import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import { resolveSearchResults } from './resolveSearchResults'

const TON_ID = 'ton:mainnet/slip44:607'
const GRAM_ETH_ID = 'eip155:1/erc20:0xgram'
const GRAM_BSC_ID = 'eip155:56/erc20:0xgram'
const USDC_ID = 'eip155:1/erc20:0xusdc'

const TON = { assetId: TON_ID } as Asset
const GRAM_ETH = { assetId: GRAM_ETH_ID, relatedAssetKey: TON_ID } as Asset
const GRAM_BSC = { assetId: GRAM_BSC_ID, relatedAssetKey: TON_ID } as Asset
const USDC = { assetId: USDC_ID } as Asset

const baseArgs = {
  relatedAssetIdsByKey: { [TON_ID]: [TON_ID, GRAM_ETH_ID, GRAM_BSC_ID], [USDC_ID]: [USDC_ID] },
  assetsById: { [TON_ID]: TON, [GRAM_ETH_ID]: GRAM_ETH, [GRAM_BSC_ID]: GRAM_BSC, [USDC_ID]: USDC },
  groupVariants: false,
}

describe('resolveSearchResults', () => {
  it('keeps usable results in their search order', () => {
    expect(
      resolveSearchResults({
        ...baseArgs,
        resultAssetIds: [TON_ID, USDC_ID],
        usableAssetsById: { [USDC_ID]: USDC, [TON_ID]: TON },
      }),
    ).toEqual([TON, USDC])
  })

  it('swaps a result the list rejects for its usable version, e.g. limit order buy', () => {
    expect(
      resolveSearchResults({
        ...baseArgs,
        groupVariants: true,
        resultAssetIds: [TON_ID, USDC_ID],
        usableAssetsById: { [USDC_ID]: USDC, [GRAM_ETH_ID]: GRAM_ETH },
      }),
    ).toEqual([GRAM_ETH, USDC])
  })

  it('keeps the rejected result as one row when it has several usable versions and rows are grouped', () => {
    expect(
      resolveSearchResults({
        ...baseArgs,
        groupVariants: true,
        resultAssetIds: [TON_ID],
        usableAssetsById: { [GRAM_ETH_ID]: GRAM_ETH, [GRAM_BSC_ID]: GRAM_BSC },
      }),
    ).toEqual([TON])
  })

  it('lists each usable version when rows are not grouped', () => {
    expect(
      resolveSearchResults({
        ...baseArgs,
        resultAssetIds: [TON_ID],
        usableAssetsById: { [GRAM_ETH_ID]: GRAM_ETH, [GRAM_BSC_ID]: GRAM_BSC },
      }),
    ).toEqual([GRAM_ETH, GRAM_BSC])
  })

  it('does not repeat a version that is also its own result', () => {
    expect(
      resolveSearchResults({
        ...baseArgs,
        resultAssetIds: [TON_ID, GRAM_ETH_ID],
        usableAssetsById: { [GRAM_ETH_ID]: GRAM_ETH },
      }),
    ).toEqual([GRAM_ETH])
  })

  it('drops a result with no usable version', () => {
    expect(
      resolveSearchResults({ ...baseArgs, resultAssetIds: [TON_ID], usableAssetsById: {} }),
    ).toEqual([])
  })
})
