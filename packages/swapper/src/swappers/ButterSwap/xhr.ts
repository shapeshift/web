import { fromAssetId, solanaChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { chainIdToFeeAssetId } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { zeroAddress } from 'viem'

import type { SwapErrorRight } from '../../types'
import { TradeQuoteError } from '../../types'
import { makeSwapErrorRight } from '../../utils'
import type {
  BridgeInfo,
  BridgeInfoApiResponse,
  BuildTxResponse,
  DetailedBridgeInfo,
  DetailedBridgeInfoApiResponse,
  RouteResponse,
} from './types'
import { butterHistoryService } from './utils/butterSwapHistoryService'
import { butterService } from './utils/butterSwapService'
import { chainIdToButterSwapChainId } from './utils/helpers'

export enum ButterSwapErrorCode {
  ParameterError = 2000,
  ChainNotSupported = 2001,
  TokenNotSupported = 2002,
  NoRouteFound = 2003,
  InsufficientLiquidity = 2004,
  SlippageOutOfRange = 2005,
  InsufficientAmount = 2006,
  InvalidAddress = 2007,
}

type ButterSwapPromise<T> = Promise<Result<T, SwapErrorRight>>

/**
 * @see https://docs.butternetwork.io/butter-swap-integration/butter-api-for-routing/get-route
 */
export type GetButterRouteArgs = {
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  slippage: string
  affiliate?: string
}

const SOLANA_NATIVE_ADDRESS = 'So11111111111111111111111111111111111111112'

export const getButterRoute = async ({
  sellAsset,
  buyAsset,
  sellAmountCryptoBaseUnit,
  slippage,
  affiliate,
}: GetButterRouteArgs): ButterSwapPromise<RouteResponse> => {
  const butterFromChainId = chainIdToButterSwapChainId(sellAsset.chainId)
  const butterToChainId = chainIdToButterSwapChainId(buyAsset.chainId)
  if (!butterFromChainId || !butterToChainId) {
    return Err(
      makeSwapErrorRight({
        message: '[getButterRoute] Unsupported chainId',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  const feeAssetId = chainIdToFeeAssetId(sellAsset.chainId)
  const sellAssetIsNative = sellAsset.assetId === feeAssetId
  const buyAssetIsNative = buyAsset.assetId === chainIdToFeeAssetId(buyAsset.chainId)

  const { assetReference: sellAssetAddressRaw } = fromAssetId(sellAsset.assetId)
  const { assetReference: buyAssetAddressRaw } = fromAssetId(buyAsset.assetId)

  const sellAssetAddress = (() => {
    if (sellAsset.chainId === solanaChainId && sellAssetIsNative) return SOLANA_NATIVE_ADDRESS
    if (sellAssetIsNative) return zeroAddress
    return sellAssetAddressRaw
  })()

  const buyAssetAddress = (() => {
    if (buyAsset.chainId === solanaChainId && buyAssetIsNative) return SOLANA_NATIVE_ADDRESS
    if (buyAssetIsNative) return zeroAddress
    return buyAssetAddressRaw
  })()

  const isSameChainSolanaSwap =
    sellAsset.chainId === solanaChainId && buyAsset.chainId === solanaChainId

  const params = {
    fromChainId: butterFromChainId,
    tokenInAddress: sellAssetAddress,
    toChainId: butterToChainId,
    tokenOutAddress: buyAssetAddress,
    amount: sellAmountCryptoBaseUnit,
    type: 'exactIn',
    slippage,
    entrance: 'shapeshift',
    affiliate,
    // This is only required to collect affiliate fees for same-chain Solana swaps. For EVM swaps the default referrer address (EVM) of the affiliate code is used.
    ...(isSameChainSolanaSwap && { referrer: 'Bh7R3MeJ98D7Ersxh7TgVQVQUSmDMqwrFVHH9DLfb4u3' }),
  }
  const result = await butterService.get<RouteResponse>('/route', { params })
  if (result.isErr()) return Err(result.unwrapErr())
  const data = result.unwrap().data
  return Ok(data)
}

export type ButterBuildTxArgs = {
  hash: string
  slippage: string
  from: string
  receiver: string
}

export const fetchTxData = async ({
  hash,
  slippage,
  from,
  receiver,
}: ButterBuildTxArgs): ButterSwapPromise<BuildTxResponse> => {
  const result = await butterService.get<BuildTxResponse>('/swap', {
    params: { hash, slippage, from, receiver },
  })
  if (result.isErr()) return Err(result.unwrapErr())
  const data = result.unwrap().data
  return Ok(data)
}

export function isRouteSuccess(
  response: RouteResponse,
): response is Extract<RouteResponse, { errno: 0 }> {
  return response.errno === 0
}

export function isBuildTxSuccess(
  response: BuildTxResponse,
): response is Extract<BuildTxResponse, { errno: 0 }> {
  return response.errno === 0
}

/**
 * @see https://docs.butternetwork.io/butter-swap-integration/butter-api-for-swap-data/get-swap-history-by-source-hash
 */
export const getBridgeInfoBySourceHash = async (
  hash: string,
): ButterSwapPromise<BridgeInfo | undefined> => {
  try {
    const result = await butterHistoryService.get<BridgeInfoApiResponse>(
      '/api/queryBridgeInfoBySourceHash',
      {
        params: { hash },
      },
    )
    if (result.isErr()) {
      throw result.unwrapErr()
    }
    const data = result.unwrap().data
    if (!data || !data.data || !data.data.info) {
      return Ok(undefined)
    }
    return Ok(data.data.info)
  } catch (e) {
    return Ok(undefined)
  }
}

/**
 * Get detailed bridge information by ID
 * This endpoint is undocumented by Butter, but used in their UI
 */
export const getBridgeInfoById = async (
  id: number,
): ButterSwapPromise<DetailedBridgeInfo | undefined> => {
  try {
    const result = await butterHistoryService.get<DetailedBridgeInfoApiResponse>(
      '/api/queryBridgeInfoById',
      {
        params: { id },
      },
    )
    if (result.isErr()) {
      throw result.unwrapErr()
    }
    const data = result.unwrap().data
    if (!data || !data.data || !data.data.info) {
      return Ok(undefined)
    }
    return Ok(data.data.info)
  } catch (e) {
    return Ok(undefined)
  }
}

/**
 * Maps ButterSwap API error codes to human-readable error types.
 * @see https://docs.butternetwork.io/butter-swap-integration/butter-api-for-routing/error-code-list
 */

export function butterSwapErrorToTradeQuoteError(errno: number): TradeQuoteError {
  switch (errno) {
    case ButterSwapErrorCode.ParameterError:
      return TradeQuoteError.QueryFailed
    case ButterSwapErrorCode.ChainNotSupported:
      return TradeQuoteError.UnsupportedChain
    case ButterSwapErrorCode.TokenNotSupported:
      return TradeQuoteError.UnsupportedTradePair
    case ButterSwapErrorCode.NoRouteFound:
      return TradeQuoteError.NoRouteFound
    case ButterSwapErrorCode.InsufficientLiquidity:
      return TradeQuoteError.NoRouteFound
    case ButterSwapErrorCode.SlippageOutOfRange:
      return TradeQuoteError.FinalQuoteMaxSlippageExceeded
    case ButterSwapErrorCode.InsufficientAmount:
      return TradeQuoteError.SellAmountBelowMinimum
    case ButterSwapErrorCode.InvalidAddress:
      return TradeQuoteError.QueryFailed
    default:
      return TradeQuoteError.QueryFailed
  }
}
