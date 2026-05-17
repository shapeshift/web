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

  // Filter out the native APT token from CoinGecko to avoid duplicates
  // CoinGecko includes native APT both as the slip44 base asset (added manually) and
  // as the coin-standard token (0x1::aptos_coin::AptosCoin) at the same metadata
  // address 0xa under the aptosCoin namespace.
  const nativeAptCoinPattern = /^aptos:[^/]+\/aptosCoin:(0x0*a|0x1::aptos_coin::AptosCoin)$/i
  const tokensOnly = assets.filter(asset => !nativeAptCoinPattern.test(asset.assetId))

  const allAssets = uniqBy(tokensOnly, 'assetId')

  return [unfreeze(aptos), ...allAssets]
}
