import type { RouterDataV3 } from '@cetusprotocol/aggregator-sdk'
import { AggregatorClient, Env } from '@cetusprotocol/aggregator-sdk'
import { SuiClient } from '@cetusprotocol/aggregator-sdk/node_modules/@mysten/sui/client'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { bn, bnOrZero } from '@shapeshiftoss/utils'

let suiClientInstance: SuiClient | undefined
let aggregatorClientInstance: AggregatorClient | undefined
let currentRpcUrl: string | undefined

export const getAggregatorClient = (rpcUrl: string): AggregatorClient => {
  if (!aggregatorClientInstance || !suiClientInstance || currentRpcUrl !== rpcUrl) {
    suiClientInstance = new SuiClient({ url: rpcUrl })
    aggregatorClientInstance = new AggregatorClient({
      client: suiClientInstance,
      env: Env.Mainnet,
      signer: '0x0',
    })
    currentRpcUrl = rpcUrl
  }
  return aggregatorClientInstance
}

export const getSuiClient = (rpcUrl: string): SuiClient => {
  if (!suiClientInstance || currentRpcUrl !== rpcUrl) {
    suiClientInstance = new SuiClient({ url: rpcUrl })
    currentRpcUrl = rpcUrl
  }
  return suiClientInstance
}

export const getCoinType = (asset: Asset): string => {
  const { assetReference, assetNamespace } = fromAssetId(asset.assetId)

  // For native SUI token, the assetReference is 'slip44:784' but Cetus expects '0x2::sui::SUI'
  if (assetNamespace === 'slip44') {
    return '0x2::sui::SUI'
  }

  // For other tokens, the assetReference should be the full coin type
  return assetReference
}

export const calculateAmountLimit = (
  estimatedAmount: string,
  slippageTolerancePercentageDecimal: string | undefined,
  isBuyAmount: boolean,
): string => {
  if (!slippageTolerancePercentageDecimal) {
    return estimatedAmount
  }

  const slippageFactor = bn(1).minus(slippageTolerancePercentageDecimal)

  if (isBuyAmount) {
    return bnOrZero(estimatedAmount).times(slippageFactor).toFixed(0)
  }

  const maxSlippageFactor = bn(1).plus(slippageTolerancePercentageDecimal)
  return bnOrZero(estimatedAmount).times(maxSlippageFactor).toFixed(0)
}

export const findBestRoute = async (
  client: AggregatorClient,
  sellCoinType: string,
  buyCoinType: string,
  sellAmountCryptoBaseUnit: string,
): Promise<RouterDataV3 | undefined> => {
  const routerData = await client.findRouters({
    from: sellCoinType,
    target: buyCoinType,
    amount: sellAmountCryptoBaseUnit,
    byAmountIn: true,
  })

  if (!routerData) {
    console.warn('[Cetus Aggregator] No route found for', sellCoinType, buyCoinType)
    return undefined
  }

  if (routerData.insufficientLiquidity) {
    console.warn('[Cetus Aggregator] Insufficient liquidity for', sellCoinType, buyCoinType)
    return undefined
  }

  if (routerData.error) {
    console.warn('[Cetus Aggregator] Error finding route:', routerData.error)
    return undefined
  }

  return routerData
}
