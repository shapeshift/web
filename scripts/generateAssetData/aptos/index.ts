import { adapters, aptosChainId, ASSET_NAMESPACE, toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { aptos, unfreeze } from '@shapeshiftoss/utils'
import uniqBy from 'lodash/uniqBy'

import * as coingecko from '../coingecko'

const APT_COIN_ASSET_ID = toAssetId({
  chainId: aptosChainId,
  assetNamespace: ASSET_NAMESPACE.aptosCoin,
  assetReference: '0x1::aptos_coin::AptosCoin',
})

export const getAssets = async (): Promise<Asset[]> => {
  const results = await Promise.allSettled([coingecko.getAssets(aptosChainId)])

  const [assets] = results.map(result => {
    if (result.status === 'fulfilled') return result.value
    console.error('Error fetching Aptos assets from CoinGecko:', result.reason)
    return []
  })

  const listedAssets: Asset[] = []
  const rekeyedAssets: Asset[] = []

  for (const asset of assets) {
    const assetId = await adapters.getAptosIndexedAssetId(asset.assetId)
    if (!assetId) continue

    if (assetId === asset.assetId) {
      listedAssets.push(asset)
    } else {
      rekeyedAssets.push({ ...asset, assetId })
    }
  }

  // coingecko's coin type listing wins over its paired fungible asset listing
  const tokens = uniqBy([...listedAssets, ...rekeyedAssets], 'assetId')

  const tokensOnly = tokens.filter(asset => asset.assetId !== APT_COIN_ASSET_ID)

  return [unfreeze(aptos), ...tokensOnly]
}
