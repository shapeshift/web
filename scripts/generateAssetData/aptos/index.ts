import { aptosChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { aptos, unfreeze } from '@shapeshiftoss/utils'
import uniqBy from 'lodash/uniqBy'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const results = await Promise.allSettled([coingecko.getAssets(aptosChainId)])

  const [assets] = results.map(result => {
    if (result.status === 'fulfilled') return result.value
    console.error('Error fetching Aptos assets from CoinGecko:', result.reason)
    return []
  })

  // Native APT is the slip44 base asset; drop its coin type and its fungible asset address (0xa)
  const nativeAptCoinPattern = /^aptos:1\/(coin:0x1::aptos_coin::AptosCoin|fungible:0x0*a)$/i
  const tokensOnly = assets.filter(asset => !nativeAptCoinPattern.test(asset.assetId))

  const allAssets = uniqBy(tokensOnly, 'assetId')

  return [unfreeze(aptos), ...allAssets]
}
