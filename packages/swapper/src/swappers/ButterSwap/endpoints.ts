import { Err, Ok } from '@sniptt/monads'

import { TradeQuoteError } from '../../types'
import { makeSwapErrorRight } from '../../utils'
import { butterService } from './utils/butterSwapService'
import type {
  BuildTxResponse,
  FindTokenResponse,
  RouteResponse,
  SupportedChainListResponse,
} from './validators'
import {
  BuildTxResponseValidator,
  FindTokenResponseValidator,
  RouteResponseValidator,
  SupportedChainListResponseValidator,
} from './validators'

export const getSupportedChainList = () => {
  return butterService.get<SupportedChainListResponse>('/supportedChainList').then(res =>
    res
      .map(res => res.data)
      .andThen(data => {
        try {
          const parsedData = SupportedChainListResponseValidator.parse(data)
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
      }),
  )
}

export const findToken = (chainId: number, address: string) => {
  return butterService
    .get<FindTokenResponse>('/findToken', { params: { chainId, address } })
    .then(res =>
      res
        .map(res => res.data)
        .andThen(data => {
          try {
            const parsedData = FindTokenResponseValidator.parse(data)
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
        }),
    )
}

export const getRoute = (
  fromChainId: number,
  tokenInAddress: string,
  toChainId: number,
  tokenOutAddress: string,
  amount: string,
) => {
  return butterService
    .get<RouteResponse>('/route', {
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
    .then(res =>
      res
        .map(res => res.data)
        .andThen(data => {
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
        }),
    )
}

export const getBuildTx = (hash: string, slippage: string, from: string, receiver: string) => {
  return butterService
    .get<BuildTxResponse>('/swap', {
      params: { hash, slippage, from, receiver },
    })
    .then(res =>
      res
        .map(res => res.data)
        .andThen(data => {
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
        }),
    )
}
