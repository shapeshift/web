import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { isSome } from '@shapeshiftoss/utils'

import type { ThornodePoolResponse } from '../../thorchain-utils'
import { thorService } from '../../thorchain-utils'
import type { Swapper, SwapperConfig } from '../../types'
import { executeEvmTransaction } from '../../utils'
import { poolAssetIdToAssetId } from './utils/poolAssetHelpers/poolAssetHelpers'

const getSupportedAssets = async (
  config: SwapperConfig,
): Promise<{
  supportedSellAssetIds: AssetId[]
  supportedBuyAssetIds: AssetId[]
}> => {
  const thorchainSwapLongtailEnabled = config.VITE_FEATURE_THORCHAINSWAP_LONGTAIL

  const supportedSellAssetIds = [thorchainAssetId]
  const supportedBuyAssetIds = [thorchainAssetId]

  const url = `${config.VITE_THORCHAIN_NODE_URL}/thorchain/pools`

  const res = await thorService.get<ThornodePoolResponse[]>(url)
  if (!res.isOk()) return { supportedSellAssetIds, supportedBuyAssetIds }

  const { data: pools } = res.unwrap()

  const assetIds = pools
    .filter(pool => pool.status === 'Available')
    .map(pool => poolAssetIdToAssetId(pool.asset))
    .filter(isSome)

  assetIds.forEach(assetId => {
    supportedSellAssetIds.push(assetId)
    supportedBuyAssetIds.push(assetId)
  })

  if (thorchainSwapLongtailEnabled) {
    const longtailAssetIds: AssetId[] = (
      await import('./generated/generatedThorLongtailTokens.json')
    ).default

    const chainIds = new Set(assetIds.map(assetId => fromAssetId(assetId).chainId))

    longtailAssetIds.forEach(assetId => {
      if (chainIds.has(fromAssetId(assetId).chainId)) {
        supportedSellAssetIds.push(assetId)
        supportedBuyAssetIds.push(assetId)
      }
    })
  }

  return { supportedSellAssetIds, supportedBuyAssetIds }
}

export const thorchainSwapper: Swapper = {
  executeEvmTransaction,
  executeCosmosSdkTransaction: (txToSign, { signAndBroadcastTransaction }) => {
    return signAndBroadcastTransaction(txToSign)
  },
  executeUtxoTransaction: (txToSign, { signAndBroadcastTransaction }) => {
    return signAndBroadcastTransaction(txToSign)
  },
  filterAssetIdsBySellable: async (_, config) => {
    const { supportedSellAssetIds } = await getSupportedAssets(config)

    return supportedSellAssetIds
  },
  filterBuyAssetsBySellAssetId: async ({ assets, sellAsset, config }) => {
    const { supportedSellAssetIds, supportedBuyAssetIds } = await getSupportedAssets(config)

    if (!supportedSellAssetIds.includes(sellAsset.assetId)) return []

    const filteredAssets = assets.filter(
      asset => supportedBuyAssetIds.includes(asset.assetId) && asset.assetId !== sellAsset.assetId,
    )

    return filteredAssets.map(asset => asset.assetId)
  },
}
