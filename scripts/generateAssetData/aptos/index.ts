import {
  adapters,
  aptosChainId,
  ASSET_NAMESPACE,
  fromAssetId,
  toAssetId,
} from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { aptos, unfreeze } from '@shapeshiftoss/utils'
import uniqBy from 'lodash/uniqBy'

import * as coingecko from '../coingecko'

const APT_COIN_TYPE = '0x1::aptos_coin::AptosCoin'

// paired fungible assets are re-keyed to their coin type, which is how balances are indexed
const toIndexedAsset = async (asset: Asset): Promise<Asset | undefined> => {
  const { assetNamespace, assetReference } = fromAssetId(asset.assetId)
  if (assetNamespace !== ASSET_NAMESPACE.aptosFungible) return asset

  const coinType = await adapters.getAptosPairedCoinType(assetReference)
  if (coinType === null) return
  if (!coinType) return asset

  const assetId = toAssetId({
    chainId: aptosChainId,
    assetNamespace: ASSET_NAMESPACE.aptosCoin,
    assetReference: coinType,
  })

  return { ...asset, assetId }
}

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
    const indexedAsset = await toIndexedAsset(asset)
    if (!indexedAsset) continue
    if (indexedAsset.assetId === asset.assetId) listedAssets.push(asset)
    else rekeyedAssets.push(indexedAsset)
  }

  // coingecko's coin type listing wins over its paired fungible asset listing
  const tokens = uniqBy([...listedAssets, ...rekeyedAssets], 'assetId')

  // native APT is the slip44 base asset
  const tokensOnly = tokens.filter(
    asset => fromAssetId(asset.assetId).assetReference !== APT_COIN_TYPE,
  )

  return [unfreeze(aptos), ...tokensOnly]
}
