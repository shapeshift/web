import type { AssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { SunioQuoteResponse } from '../types'
import { SUNIO_API_BASE_URL, SUNIO_DEX_TYPES } from './constants'
import { assetIdToTronToken } from './helpers/helpers'
import type { SunioService } from './sunioService'

export type FetchSunioQuoteParams = {
  sellAssetId: AssetId
  buyAssetId: AssetId
  sellAmountCryptoBaseUnit: string
}

export const fetchSunioQuote = async (
  params: FetchSunioQuoteParams,
  service: SunioService,
): Promise<Result<SunioQuoteResponse, SwapErrorRight>> => {
  try {
    const { sellAssetId, buyAssetId, sellAmountCryptoBaseUnit } = params

    const fromToken = assetIdToTronToken(sellAssetId)
    const toToken = assetIdToTronToken(buyAssetId)

    const queryParams = {
      fromToken,
      toToken,
      amountIn: sellAmountCryptoBaseUnit,
      typeList: SUNIO_DEX_TYPES,
    }

    const url = `${SUNIO_API_BASE_URL}/swap/router`

    const maybeResponse = await service.get<SunioQuoteResponse>(url, {
      params: queryParams,
    })

    if (maybeResponse.isErr()) {
      return Err(maybeResponse.unwrapErr())
    }

    const { data: response } = maybeResponse.unwrap()

    if (response.code !== 0 || !response.data || response.data.length === 0) {
      return Err(
        makeSwapErrorRight({
          message: `[Sun.io] ${response.message || 'No routes found'}`,
          code: TradeQuoteError.NoRouteFound,
          details: { response },
        }),
      )
    }

    return Ok(response)
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: '[Sun.io] Failed to fetch quote',
        code: TradeQuoteError.QueryFailed,
        cause: error,
      }),
    )
  }
}
