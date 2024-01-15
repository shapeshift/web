import type { StdSignDoc } from '@keplr-wallet/types'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { BTCSignTx } from '@shapeshiftoss/hdwallet-core'
import type {
  BuyAssetBySellIdInput,
  CosmosSdkTransactionExecutionProps,
  Swapper,
  UtxoTransactionExecutionProps,
} from '@shapeshiftoss/swapper'
import { getConfig } from 'config'
import {
  buySupportedChainIds,
  sellSupportedChainIds,
} from 'lib/swapper/swappers/ThorchainSwapper/constants'
import type { ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { poolAssetIdToAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from 'lib/swapper/swappers/ThorchainSwapper/utils/thorService'
import { isSome } from 'lib/utils'
import { executeEvmTransaction } from 'lib/utils/evm'

const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
const thorchainSwapLongtailEnabled = getConfig().REACT_APP_FEATURE_THORCHAINSWAP_LONGTAIL

const getSupportedAssets = async (): Promise<{
  supportedSellAssetIds: AssetId[]
  supportedBuyAssetIds: AssetId[]
}> => {
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

  filterAssetIdsBySellable: async (): Promise<AssetId[]> =>
    await getSupportedAssets().then(({ supportedSellAssetIds }) => supportedSellAssetIds),

  filterBuyAssetsBySellAssetId: async ({
    assets,
    sellAsset,
  }: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    const { supportedSellAssetIds, supportedBuyAssetIds } = await getSupportedAssets()
    if (!supportedSellAssetIds.includes(sellAsset.assetId)) return []
    return assets
      .filter(
        asset =>
          supportedBuyAssetIds.includes(asset.assetId) && asset.assetId !== sellAsset.assetId,
      )
      .map(asset => asset.assetId)
  },
}
