import { ethChainId, starknetChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { MinimalAsset } from '@shapeshiftoss/utils'
import { describe, expect, it } from 'vitest'

import { getCustomTokenAssets } from './getCustomTokenAssets'

const makeToken = (assetId: string): MinimalAsset => ({
  assetId,
  symbol: 'TKN',
  name: 'Token',
  precision: 18,
})

const ethToken = makeToken('eip155:1/erc20:0xtoken')
const starknetToken = makeToken('starknet:SN_MAIN/token:0xtoken')
const knownToken = makeToken('eip155:1/erc20:0xknown')
const assetsById = { [knownToken.assetId]: { assetId: knownToken.assetId } as Asset }

describe('getCustomTokenAssets', () => {
  it('returns tokens that are not known assets yet, on every chain without a chain filter', () => {
    const result = getCustomTokenAssets([ethToken, starknetToken, knownToken], assetsById)

    expect(result.map(asset => asset.assetId)).toEqual([ethToken.assetId, starknetToken.assetId])
  })

  it('leaves out tokens on chains the wallet cannot use', () => {
    const result = getCustomTokenAssets([ethToken, starknetToken], assetsById, chainId =>
      [ethChainId].includes(chainId),
    )

    expect(result.map(asset => asset.assetId)).toEqual([ethToken.assetId])
    expect(result[0].chainId).toBe(ethChainId)
    expect(result.some(asset => asset.chainId === starknetChainId)).toBe(false)
  })
})
