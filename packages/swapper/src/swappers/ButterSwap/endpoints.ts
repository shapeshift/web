import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

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

  try {
    const parsedData = SupportedChainListResponseValidator.parse(result.unwrap().data)
    return Ok(parsedData)
  } catch (e) {
    return Err(
      makeSwapErrorRight({
        message: '[getSupportedChainList]',
        cause: e,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
}

export const findToken = async (
  chainId: number,
  address: string,
): ButterSwapPromise<FindTokenResponse> => {
  const result = await butterService.get<FindTokenResponse>('/findToken', {
    params: { chainId, address },
  })

  if (result.isErr()) return Err(result.unwrapErr())

  try {
    const parsedData = FindTokenResponseValidator.parse(result.unwrap().data)
    return Ok(parsedData)
  } catch (e) {
    return Err(
      makeSwapErrorRight({
        message: '[findToken]',
        cause: e,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
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

  try {
    const parsedData = RouteResponseValidator.parse(data)
    if (parsedData.errno > 0) {
      return Err(
        makeSwapErrorRight({
          message: `[getRoute] ${parsedData.message}`,
          code: TradeQuoteError.QueryFailed,
        }),
      )
    }
    return Ok(parsedData)
  } catch (e) {
    console.error('ButterSwap getRoute raw response:', JSON.stringify(data, null, 2))
    return Err(
      makeSwapErrorRight({
        message: '[getRoute]',
        cause: e,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
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

  try {
    const parsedData = BuildTxResponseValidator.parse(data)
    if (parsedData.errno > 0) {
      return Err(
        makeSwapErrorRight({
          message: `[getBuildTx] ${parsedData.message}`,
          code: TradeQuoteError.QueryFailed,
        }),
      )
    }
    return Ok(parsedData)
  } catch (e) {
    return Err(
      makeSwapErrorRight({
        message: '[getBuildTx]',
        cause: e,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
}

export const getRouteAndSwap = async (
  fromChainId: number,
  tokenInAddress: string,
  toChainId: number,
  tokenOutAddress: string,
  amount: string,
  from: string,
  receiver: string,
): ButterSwapPromise<RouteAndSwapResponse> => {
  const result = await butterService.get<RouteAndSwapResponse>('/routeAndSwap', {
    params: {
      fromChainId,
      tokenInAddress,
      toChainId,
      tokenOutAddress,
      amount,
      type: 'exactIn',
      slippage: '150', // 1.5%
      entrance: 'Butter+',
      from,
      receiver,
    },
  })

  if (result.isErr()) return Err(result.unwrapErr())

  const data = result.unwrap().data

  try {
    const parsedData = RouteAndSwapResponseValidator.parse(data)
    if ('errno' in parsedData && parsedData.errno > 0) {
      return Err(
        makeSwapErrorRight({
          message: `[getRouteAndSwap] ${parsedData.message}`,
          code: TradeQuoteError.QueryFailed,
        }),
      )
    }
    return Ok(parsedData)
  } catch (e) {
    return Err(
      makeSwapErrorRight({
        message: '[getRouteAndSwap]',
        cause: e,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
}
