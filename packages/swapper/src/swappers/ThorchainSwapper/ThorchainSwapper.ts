import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { SignTx } from '@shapeshiftoss/chain-adapters'
import type { CosmosSdkChainId, UtxoChainId } from '@shapeshiftoss/types'
import { isSome } from '@shapeshiftoss/utils'

import type {
  BuyAssetBySellIdInput,
  CosmosSdkTransactionExecutionProps,
  Swapper,
  SwapperConfig,
  UtxoTransactionExecutionProps,
} from '../../types'
import { executeEvmTransaction } from '../../utils'
import { thorchainBuySupportedChainIds, thorchainSellSupportedChainIds } from './constants'
import type { ThornodePoolResponse } from './types'
import { poolAssetIdToAssetId } from './utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from './utils/thorService'

const getSupportedAssets = async (
  config: SwapperConfig,
): Promise<{
  supportedSellAssetIds: AssetId[]
  supportedBuyAssetIds: AssetId[]
}> => {
  const daemonUrl = config.VITE_THORCHAIN_NODE_URL
  const thorchainSwapLongtailEnabled = config.VITE_FEATURE_THORCHAINSWAP_LONGTAIL
  let supportedSellAssetIds: AssetId[] = [thorchainAssetId]
  let supportedBuyAssetIds: AssetId[] = [thorchainAssetId]
  const poolResponse = await thorService.get<ThornodePoolResponse[]>(`${daemonUrl}/thorchain/pools`)

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
    thorchainSellSupportedChainIds[chainId] && supportedSellAssetIds.push(assetId)
    thorchainBuySupportedChainIds[chainId] && supportedBuyAssetIds.push(assetId)
  })

  return { supportedSellAssetIds, supportedBuyAssetIds }
}

export const thorchainSwapper: Swapper = {
  executeEvmTransaction,

  executeCosmosSdkTransaction: async (
    txToSign: SignTx<CosmosSdkChainId>,
    { signAndBroadcastTransaction }: CosmosSdkTransactionExecutionProps,
  ): Promise<string> => {
    return await signAndBroadcastTransaction(txToSign)
  },

  executeUtxoTransaction: async (
    txToSign: SignTx<UtxoChainId>,
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
