import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import * as z from 'myzod'

import type { SwapErrorRight } from '../../types'
import { TradeQuoteError } from '../../types'
import { makeSwapErrorRight } from '../../utils'
import { butterService } from './utils/butterSwapService'
import type {
  BuildTxResponse,
  FindTokenResponse,
  RouteAndSwapResponse,
  RouteResponse,
  SupportedChainListResponse,
} from './validators'
import {
  BridgeInfoResponseValidator,
  BuildTxResponseValidator,
  FindTokenResponseValidator,
  RouteAndSwapResponseValidator,
  RouteResponseValidator,
  SupportedChainListResponseValidator,
} from './validators'

type ButterSwapPromise<T> = Promise<Result<T, SwapErrorRight>>

/**
 * @see https://docs.butternetwork.io/butter-swap-integration/butter-api-for-routing/get-supportedchainlist
 */
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

/**
 * @see https://docs.butternetwork.io/butter-swap-integration/butter-api-for-routing/get-findtoken
 */
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

/**
 * @see https://docs.butternetwork.io/butter-swap-integration/butter-api-for-routing/get-route
 */
export const getRoute = async (
  fromChainId: number,
  tokenInAddress: string,
  toChainId: number,
  tokenOutAddress: string,
  amountHumanUnits: string,
  slippage: string,
): ButterSwapPromise<RouteResponse> => {
  const result = await butterService.get<RouteResponse>('/route', {
    params: {
      fromChainId,
      tokenInAddress,
      toChainId,
      tokenOutAddress,
      amount: amountHumanUnits,
      type: 'exactIn',
      slippage,
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

/**
 * @see https://docs.butternetwork.io/butter-swap-integration/butter-api-for-routing/get-swap
 */
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
  console.log('[ButterSwap /swap] raw response:', JSON.stringify(data, null, 2))
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

/**
 * @see https://docs.butternetwork.io/butter-swap-integration/butter-api-for-routing/get-routeandswap
 */
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
  console.log('[ButterSwap /routeAndSwap] raw response:', JSON.stringify(data, null, 2))
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

/**
 * @see https://docs.butternetwork.io/butter-swap-integration/butter-api-for-swap-data/get-swap-history-by-source-hash
 */
export const getBridgeInfoBySourceHash = async (sourceHash: string): Promise<any | undefined> => {
  try {
    const result = await butterService.get<any>('/api/queryBridgeInfoBySourceHash', {
      params: { sourceHash },
    })
    if (result.isErr()) throw result.unwrapErr()
    const data = result.unwrap().data
    const validation = BridgeInfoResponseValidator.try(data)
    if (validation instanceof z.ValidationError) return undefined
    if ('errno' in validation && validation.errno !== 0) return undefined
    return Array.isArray(validation) ? validation[0] : validation
  } catch (e) {
    return undefined
  }
}
