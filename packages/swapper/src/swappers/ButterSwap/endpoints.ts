import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import * as z from 'myzod'

import type {
  CommonTradeQuoteInput,
  SwapErrorRight,
  SwapperApi,
  SwapperDeps,
  TradeQuote,
} from '../../types'
import { SwapperName, TradeQuoteError } from '../../types'
import { makeSwapErrorRight } from '../../utils'
import { butterService } from './utils/butterSwapService'
import { chainIdToButterSwapChainId } from './utils/helpers'
import type {
  BuildTxResponse,
  FindTokenResponse,
  RouteAndSwapResponse,
  RouteResponse,
  SupportedChainListResponse,
} from './validators'
import {
  BuildTxResponseValidator,
  FindTokenResponseValidator,
  RouteAndSwapResponseValidator,
  RouteResponseValidator,
  SupportedChainListResponseValidator,
} from './validators'

type ButterSwapPromise<T> = Promise<Result<T, SwapErrorRight>>

export const getSupportedChainList = async (): ButterSwapPromise<SupportedChainListResponse> => {
  const result = await butterService.get<SupportedChainListResponse>('/supportedChainList')

  if (result.isErr()) return Err(result.unwrapErr())

  const data = result.unwrap().data
  const validation = SupportedChainListResponseValidator.try(data)
  if (validation instanceof z.ValidationError) {
    return Err(
      makeSwapErrorRight({
        message: '[getSupportedChainList]',
        cause: validation,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
  return Ok(validation)
}

export const findToken = async (
  chainId: number,
  address: string,
): ButterSwapPromise<FindTokenResponse> => {
  const result = await butterService.get<FindTokenResponse>('/findToken', {
    params: { chainId, address },
  })

  if (result.isErr()) return Err(result.unwrapErr())

  const data = result.unwrap().data
  const validation = FindTokenResponseValidator.try(data)
  if (validation instanceof z.ValidationError) {
    return Err(
      makeSwapErrorRight({
        message: '[findToken]',
        cause: validation,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
  return Ok(validation)
}

export const getRoute = async (
  fromChainId: number,
  tokenInAddress: string,
  toChainId: number,
  tokenOutAddress: string,
  amount: string,
): ButterSwapPromise<RouteResponse> => {
  const result = await butterService.get<RouteResponse>('/route', {
    params: {
      fromChainId,
      tokenInAddress,
      toChainId,
      tokenOutAddress,
      amount,
      type: 'exactIn',
      slippage: '150', // 1.5%
      entrance: 'Butter+',
    },
  })

  if (result.isErr()) return Err(result.unwrapErr())

  const data = result.unwrap().data
  const validation = RouteResponseValidator.try(data)
  if (validation instanceof z.ValidationError) {
    return Err(
      makeSwapErrorRight({
        message: '[getRoute]',
        cause: validation,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
  if (!isRouteSuccess(validation)) {
    return Err(
      makeSwapErrorRight({
        message: `[getRoute] ${validation.message}`,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
  return Ok(validation)
}

export const getBuildTx = async (
  hash: string,
  slippage: string,
  from: string,
  receiver: string,
): ButterSwapPromise<BuildTxResponse> => {
  const result = await butterService.get<BuildTxResponse>('/swap', {
    params: { hash, slippage, from, receiver },
  })

  if (result.isErr()) return Err(result.unwrapErr())

  const data = result.unwrap().data
  const validation = BuildTxResponseValidator.try(data)
  if (validation instanceof z.ValidationError) {
    return Err(
      makeSwapErrorRight({
        message: '[getBuildTx]',
        cause: validation,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
  if (!isBuildTxSuccess(validation)) {
    return Err(
      makeSwapErrorRight({
        message: `[getBuildTx] ${validation.message}`,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
  return Ok(validation)
}

export const getRouteAndSwap = async (
  fromChainId: number,
  tokenInAddress: string,
  toChainId: number,
  tokenOutAddress: string,
  amount: string,
  from: string,
  receiver: string,
  slippage: string,
): ButterSwapPromise<RouteAndSwapResponse> => {
  const result = await butterService.get<RouteAndSwapResponse>('/routeAndSwap', {
    params: {
      fromChainId,
      tokenInAddress,
      toChainId,
      tokenOutAddress,
      amount,
      type: 'exactIn',
      slippage,
      entrance: 'Butter+',
      from,
      receiver,
    },
  })

  if (result.isErr()) return Err(result.unwrapErr())

  const data = result.unwrap().data
  const validation = RouteAndSwapResponseValidator.try(data)
  if (validation instanceof z.ValidationError) {
    return Err(
      makeSwapErrorRight({
        message: '[getRouteAndSwap]',
        cause: validation,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
  if (!isRouteAndSwapSuccess(validation)) {
    return Err(
      makeSwapErrorRight({
        message: `[getRouteAndSwap] ${validation.message}`,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
  return Ok(validation)
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

export function isRouteAndSwapSuccess(
  response: RouteAndSwapResponse,
): response is Extract<RouteAndSwapResponse, { errno: 0 }> {
  return response.errno === 0
}

export const butterSwapApi: SwapperApi = {
  getTradeQuote: async (input: CommonTradeQuoteInput, deps: SwapperDeps) => {
    const {
      sellAsset,
      buyAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: amount,
      receiveAddress,
      slippageTolerancePercentageDecimal,
    } = input
    const { assertGetChainAdapter: getChainAdapter } = deps
    const sellChainId = getChainAdapter(sellAsset.chainId).getChainId()
    const buyChainId = getChainAdapter(buyAsset.chainId).getChainId()
    const fromChainId = chainIdToButterSwapChainId(sellChainId)
    const toChainId = chainIdToButterSwapChainId(buyChainId)
    if (!fromChainId || !toChainId) {
      return Err(
        makeSwapErrorRight({
          message: '[getTradeQuote] Unsupported chainId',
          code: TradeQuoteError.UnsupportedChain,
        }),
      )
    }
    const result = await getRoute(
      fromChainId,
      sellAsset.assetId,
      toChainId,
      buyAsset.assetId,
      amount,
    )
    if (result.isErr()) return Err(result.unwrapErr())
    const routeResponse = result.unwrap()
    if (!isRouteSuccess(routeResponse)) {
      return Err(
        makeSwapErrorRight({
          message: `[getTradeQuote] ${routeResponse.message}`,
          code: TradeQuoteError.QueryFailed,
        }),
      )
    }
    const route = routeResponse.data[0]
    const tradeQuote: TradeQuote = {
      id: route.hash,
      rate: route.srcChain.totalAmountOut,
      receiveAddress,
      affiliateBps: '0',
      isStreaming: false,
      quoteOrRate: 'quote',
      swapperName: SwapperName.ButterSwap,
      slippageTolerancePercentageDecimal,
      steps: [
        {
          buyAmountBeforeFeesCryptoBaseUnit: '0',
          buyAmountAfterFeesCryptoBaseUnit: '0',
          sellAmountIncludingProtocolFeesCryptoBaseUnit: amount,
          feeData: {
            networkFeeCryptoBaseUnit: '0',
            protocolFees: {},
          },
          rate: route.srcChain.totalAmountOut,
          source: SwapperName.ButterSwap,
          buyAsset,
          sellAsset,
          accountNumber: 0,
          allowanceContract: '0x0',
          estimatedExecutionTimeMs: route.timeEstimated,
        },
      ],
    }
    return Ok([tradeQuote])
  },
  checkTradeStatus: () => {
    throw new Error('checkTradeStatus Not implemented')
  },
  getTradeRate: () => {
    throw new Error('getTradeRate Not implemented')
  },
  getUnsignedTx: () => {
    throw new Error('getUnsignedTx Not implemented')
  },
}
