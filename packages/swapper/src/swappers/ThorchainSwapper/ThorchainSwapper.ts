import type { StdSignDoc } from '@keplr-wallet/types'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { BTCSignTx } from '@shapeshiftoss/hdwallet-core'
import { isSome } from '@shapeshiftoss/utils'

import type {
  BuyAssetBySellIdInput,
  CosmosSdkTransactionExecutionProps,
  Swapper,
  SwapperConfig,
  UtxoTransactionExecutionProps,
} from '../../types'
import { executeEvmTransaction } from '../../utils'
import { buySupportedChainIds, sellSupportedChainIds } from './constants'
import type { ThornodePoolResponse } from './types'
import { poolAssetIdToAssetId } from './utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from './utils/thorService'

const getSupportedAssets = async (
  config: SwapperConfig,
): Promise<{
  supportedSellAssetIds: AssetId[]
  supportedBuyAssetIds: AssetId[]
}> => {
  const daemonUrl = config.REACT_APP_THORCHAIN_NODE_URL
  const thorchainSwapLongtailEnabled = config.REACT_APP_FEATURE_THORCHAINSWAP_LONGTAIL
  let supportedSellAssetIds: AssetId[] = [thorchainAssetId]
  let supportedBuyAssetIds: AssetId[] = [thorchainAssetId]
  const poolResponse = await thorService.get<ThornodePoolResponse[]>(
    `${daemonUrl}/lcd/thorchain/pools`,
  )

  const longtailTokensJson = await import('./generated/generatedThorLongtailTokens.json')
  const longtailTokens: AssetId[] = longtailTokensJson.default
  const l1Tokens = poolResponse.isOk()
    ? poolResponse
        .unwrap()
        .data.filter(pool => pool.status === 'Available')
        .map(pool => poolAssetIdToAssetId(pool.asset))
        .filter(isSome)
    : []

  const allTokens = thorchainSwapLongtailEnabled ? [...longtailTokens, ...l1Tokens] : l1Tokens

  allTokens.forEach(assetId => {
    const chainId = fromAssetId(assetId).chainId
    sellSupportedChainIds[chainId] && supportedSellAssetIds.push(assetId)
    buySupportedChainIds[chainId] && supportedBuyAssetIds.push(assetId)
  })

  return { supportedSellAssetIds, supportedBuyAssetIds }
}

export const thorchainSwapper: Swapper = {
  executeEvmTransaction,

  executeCosmosSdkTransaction: async (
    txToSign: StdSignDoc,
    { signAndBroadcastTransaction }: CosmosSdkTransactionExecutionProps,
  ): Promise<string> => {
    return await signAndBroadcastTransaction(txToSign)
  },

  executeUtxoTransaction: async (
    txToSign: BTCSignTx,
    { signAndBroadcastTransaction }: UtxoTransactionExecutionProps,
  ): Promise<string> => {
    return await signAndBroadcastTransaction(txToSign)
  },

  filterAssetIdsBySellable: async (_, config): Promise<AssetId[]> =>
    await getSupportedAssets(config).then(({ supportedSellAssetIds }) => supportedSellAssetIds),

  filterBuyAssetsBySellAssetId: async ({
    assets,
    sellAsset,
    config,
  }: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    const { supportedSellAssetIds, supportedBuyAssetIds } = await getSupportedAssets(config)
    if (!supportedSellAssetIds.includes(sellAsset.assetId)) return []
    return assets
      .filter(
        asset =>
          supportedBuyAssetIds.includes(asset.assetId) && asset.assetId !== sellAsset.assetId,
      )
      .map(asset => asset.assetId)
  },
}
