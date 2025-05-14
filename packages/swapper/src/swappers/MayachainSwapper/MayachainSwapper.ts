import type { AssetId } from '@shapeshiftoss/caip'
import { mayachainAssetId } from '@shapeshiftoss/caip'
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
  const supportedSellAssetIds = [mayachainAssetId]
  const supportedBuyAssetIds = [mayachainAssetId]

  const url = `${config.VITE_MAYACHAIN_NODE_URL}/mayachain/pools`

  const poolResponse = await thorService.get<ThornodePoolResponse[]>(url)
  if (!poolResponse.isOk()) return { supportedSellAssetIds, supportedBuyAssetIds }

  const pools = poolResponse.unwrap().data

  const assetIds = pools
    .filter(pool => pool.status === 'Available')
    .map(pool => poolAssetIdToAssetId(pool.asset))
    .filter(isSome)

  assetIds.forEach(assetId => {
    supportedSellAssetIds.push(assetId)
    supportedBuyAssetIds.push(assetId)
  })

  return { supportedSellAssetIds, supportedBuyAssetIds }
}

export const mayachainSwapper: Swapper = {
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
