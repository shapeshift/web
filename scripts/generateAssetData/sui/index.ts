import { suiChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { sui, unfreeze } from '@shapeshiftoss/utils'
import uniqBy from 'lodash/uniqBy'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const results = await Promise.allSettled([coingecko.getAssets(suiChainId)])

  const [assets] = results.map(result => {
    if (result.status === 'fulfilled') return result.value
    console.error(result.reason)
    return []
  })

  // Filter out the native SUI token from CoinGecko to avoid duplicates
  // CoinGecko includes native SUI as both:
  // - sui:35834a8a/slip44:784 (which we add manually as the base asset)
  // - sui:35834a8a/coin:0x0000...002::sui::SUI (the native token in coin format)
  // Other chains (ETH, SOL, TRX) don't have this issue as CoinGecko doesn't include
  // their native tokens as ERC-20/SPL/TRC-20 tokens
  // Match both 0x2::sui::SUI and 0x0000...002::sui::SUI formats (0* = zero or more zeros)
  const nativeSuiCoinPattern = /^sui:[^/]+\/coin:0x0*2::sui::SUI$/i
  const tokensOnly = assets.filter(asset => !nativeSuiCoinPattern.test(asset.assetId))

  const allAssets = uniqBy(tokensOnly, 'assetId')

  return [unfreeze(sui), ...allAssets]
}
