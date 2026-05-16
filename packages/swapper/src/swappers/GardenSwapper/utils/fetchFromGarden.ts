import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { GARDEN_API_BASE_URL, GARDEN_API_KEY_HEADER } from '../constants'
import type {
  GardenAffiliateFeeEntry,
  GardenAssetId,
  GardenCreateOrderResponse,
  GardenCreateOrderResult,
  GardenOrder,
  GardenOrderRequest,
  GardenOrderResponse,
  GardenQuoteResponse,
  GardenQuoteResultItem,
} from '../types'
import { gardenService } from './gardenService'
import {
  isInsufficientLiquidityError,
  isNoRouteFoundError,
  isOutOfRangeError,
} from './helpers/helpers'

const errorMessageToTradeQuoteError = (message: string | undefined): TradeQuoteError => {
  if (isNoRouteFoundError(message)) return TradeQuoteError.NoRouteFound
  if (isInsufficientLiquidityError(message)) return TradeQuoteError.SellAmountBelowTradeFee
  if (isOutOfRangeError(message)) return TradeQuoteError.SellAmountBelowMinimum
  return TradeQuoteError.QueryFailed
}

const authHeaders = (apiKey: string) => ({
  headers: { [GARDEN_API_KEY_HEADER]: apiKey },
})

export const fetchGardenQuote = async ({
  apiKey,
  from,
  to,
  fromAmount,
  affiliateBps,
}: {
  apiKey: string
  from: GardenAssetId
  to: GardenAssetId
  fromAmount: string
  affiliateBps: string
}): Promise<Result<GardenQuoteResultItem, SwapErrorRight>> => {
  const params: Record<string, string> = { from, to, from_amount: fromAmount }
  if (affiliateBps && affiliateBps !== '0') params.affiliate_fee = affiliateBps

  const result = await gardenService.get<GardenQuoteResponse>(`${GARDEN_API_BASE_URL}/quote`, {
    params,
    ...authHeaders(apiKey),
  })

  if (result.isErr()) return Err(result.unwrapErr())

  const { data } = result.unwrap()

  if (data.status !== 'Ok' || !data.result || data.result.length === 0) {
    return Err(
      makeSwapErrorRight({
        message: data.error ?? 'Garden quote failed',
        code: errorMessageToTradeQuoteError(data.error),
        details: { error: data.error },
      }),
    )
  }

  return Ok(data.result[0])
}

export const createGardenOrder = async ({
  apiKey,
  request,
}: {
  apiKey: string
  request: GardenOrderRequest
}): Promise<Result<GardenCreateOrderResult, SwapErrorRight>> => {
  const result = await gardenService.post<GardenCreateOrderResponse>(
    `${GARDEN_API_BASE_URL}/orders`,
    request,
    authHeaders(apiKey),
  )

  if (result.isErr()) return Err(result.unwrapErr())

  const { data } = result.unwrap()

  if (data.status !== 'Ok' || !data.result) {
    return Err(
      makeSwapErrorRight({
        message: data.error ?? 'Garden order creation failed',
        code: errorMessageToTradeQuoteError(data.error),
        details: { error: data.error },
      }),
    )
  }

  return Ok(data.result)
}

export const fetchGardenOrder = async ({
  apiKey,
  orderId,
}: {
  apiKey: string
  orderId: string
}): Promise<Result<GardenOrder, SwapErrorRight>> => {
  const result = await gardenService.get<GardenOrderResponse>(
    `${GARDEN_API_BASE_URL}/orders/${orderId}`,
    authHeaders(apiKey),
  )

  if (result.isErr()) return Err(result.unwrapErr())

  const { data } = result.unwrap()

  if (data.status !== 'Ok' || !data.result) {
    return Err(
      makeSwapErrorRight({
        message: data.error ?? 'Garden order fetch failed',
        code: TradeQuoteError.QueryFailed,
        details: { error: data.error },
      }),
    )
  }

  return Ok(data.result)
}

export const buildGardenAffiliateFees = ({
  affiliateBps,
  asset,
  address,
}: {
  affiliateBps: string
  asset: GardenAffiliateFeeEntry['asset']
  address: string
}): GardenAffiliateFeeEntry[] | undefined => {
  if (!affiliateBps || affiliateBps === '0') return undefined
  const fee = Number(affiliateBps)
  if (!Number.isFinite(fee) || fee <= 0) return undefined
  return [{ asset, address, fee }]
}
