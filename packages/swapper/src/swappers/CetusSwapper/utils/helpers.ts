import type { RouterDataV3 } from '@cetusprotocol/aggregator-sdk'
import { AggregatorClient, Env } from '@cetusprotocol/aggregator-sdk'
import { SuiGrpcClient } from '@mysten/sui/grpc'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { isSupportedChainId } from './constants'

let suiClientInstance: SuiGrpcClient | undefined
let currentRpcUrl: string | undefined

export const getSuiClient = (rpcUrl: string): SuiGrpcClient => {
  if (!suiClientInstance || currentRpcUrl !== rpcUrl) {
    suiClientInstance = new SuiGrpcClient({ network: 'mainnet', baseUrl: rpcUrl })
    currentRpcUrl = rpcUrl
  }
  return suiClientInstance
}

// Cetus merges the swap output into an existing coin owned by signer, so it must be the tx sender
export const getAggregatorClient = (rpcUrl: string, signer?: string): AggregatorClient =>
  new AggregatorClient({ client: getSuiClient(rpcUrl), env: Env.Mainnet, signer })

export const assertValidTrade = ({
  sellAsset,
  buyAsset,
}: {
  sellAsset: Asset
  buyAsset: Asset
}): Result<void, SwapErrorRight> => {
  if (!isSupportedChainId(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedChainId(buyAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: buyAsset.chainId },
      }),
    )
  }

  return Ok(undefined)
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

export const findBestRoute = async (
  client: AggregatorClient,
  sellCoinType: string,
  buyCoinType: string,
  sellAmountCryptoBaseUnit: string,
  providers?: string[],
): Promise<RouterDataV3 | undefined> => {
  const routerData = await client.findRouters({
    from: sellCoinType,
    target: buyCoinType,
    amount: sellAmountCryptoBaseUnit,
    byAmountIn: true,
    ...(providers && { providers }),
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
