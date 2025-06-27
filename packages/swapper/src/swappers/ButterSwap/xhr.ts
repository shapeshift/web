import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight } from '../../types'
import type {
  BridgeInfoApiResponse,
  BuildTxResponse,
  FindTokenResponse,
  RouteAndSwapResponse,
  RouteResponse,
  SupportedChainListResponse,
} from './types'
import { butterHistoryService } from './utils/butterSwapHistoryService'
import { butterService } from './utils/butterSwapService'

type ButterSwapPromise<T> = Promise<Result<T, SwapErrorRight>>

/**
 * @see https://docs.butternetwork.io/butter-swap-integration/butter-api-for-routing/get-supportedchainlist
 */
export const getSupportedChainList = async (): ButterSwapPromise<SupportedChainListResponse> => {
  const result = await butterService.get<SupportedChainListResponse>('/supportedChainList')
  if (result.isErr()) return Err(result.unwrapErr())
  // No runtime validation, just return the data
  return Ok(result.unwrap().data)
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
  return Ok(result.unwrap().data)
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
  return Ok(result.unwrap().data)
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
  return Ok(result.unwrap().data)
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
  return Ok(result.unwrap().data)
}

export function isRouteSuccess(
  response: RouteResponse,
): response is Extract<RouteResponse, { errno: 0 }> {
  return (response as any).errno === 0
}

export function isBuildTxSuccess(
  response: BuildTxResponse,
): response is Extract<BuildTxResponse, { errno: 0 }> {
  return (response as any).errno === 0
}

export function isRouteAndSwapSuccess(
  response: RouteAndSwapResponse,
): response is Extract<RouteAndSwapResponse, { errno: 0 }> {
  return (response as any).errno === 0
}

/**
 * @see https://docs.butternetwork.io/butter-swap-integration/butter-api-for-swap-data/get-swap-history-by-source-hash
 */
export const getBridgeInfoBySourceHash = async (hash: string): Promise<any | undefined> => {
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
      return undefined
    }
    return data.data.info
  } catch (e) {
    return undefined
  }
}
