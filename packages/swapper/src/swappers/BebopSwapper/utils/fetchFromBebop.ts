import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { Address } from 'viem'
import { getAddress } from 'viem'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { BebopQuoteResponse } from '../types'
import { bebopServiceFactory } from './bebopService'
import {
  assetIdToBebopToken,
  buildBebopApiUrl,
  formatBebopAmount,
  getBebopChainName,
  getSlippageTolerance,
} from './helpers/helpers'

export const fetchBebopQuote = async ({
  buyAsset,
  sellAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  sellAddress,
  slippageTolerancePercentageDecimal,
  affiliateBps,
  apiKey,
}: {
  buyAsset: Asset
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  sellAddress: Address
  slippageTolerancePercentageDecimal: string
  affiliateBps?: string
  apiKey: string
}): Promise<Result<BebopQuoteResponse, SwapErrorRight>> => {
  try {
    const sellToken = assetIdToBebopToken(sellAsset.assetId)
    const buyToken = assetIdToBebopToken(buyAsset.assetId)
    const checksummedSellAddress = getAddress(sellAddress)
    const chainName = getBebopChainName(sellAsset.chainId)
    const sellAmountFormatted = formatBebopAmount(sellAmountIncludingProtocolFeesCryptoBaseUnit)
    const slippageBps = getSlippageTolerance(slippageTolerancePercentageDecimal)
    const url = buildBebopApiUrl(chainName, 'quote')

    const params = new URLSearchParams({
      sell_tokens: sellToken,
      buy_tokens: buyToken,
      sell_amounts: sellAmountFormatted,
      taker_address: checksummedSellAddress,
      receiver_address: checksummedSellAddress,
      slippage: slippageBps.toString(),
      approval_type: 'Standard',
      skip_validation: 'true',
      gasless: 'false',
      source: 'shapeshift',
    })

    if (affiliateBps && affiliateBps !== '0') {
      params.set('fee', affiliateBps)
    }

    const bebopService = bebopServiceFactory({ apiKey })
    const maybeResponse = await bebopService.get<BebopQuoteResponse>(`${url}?${params}`)

    if (maybeResponse.isErr()) {
      return Err(
        makeSwapErrorRight({
          message: 'Failed to fetch quote from Bebop',
          cause: maybeResponse.unwrapErr().cause,
          code: TradeQuoteError.QueryFailed,
        }),
      )
    }

    const response = maybeResponse.unwrap()

    // Log partial route failures for debugging (these are normal and don't indicate quote failure)
    if (response.data.errors && Object.keys(response.data.errors).length > 0) {
      console.debug('[Bebop] Some routes failed (this is normal):', response.data.errors)
    }

    // Validate response has routes - only fail if there are NO valid routes
    if (!response.data.routes || response.data.routes.length === 0) {
      return Err(
        makeSwapErrorRight({
          message: 'No routes available',
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    if (!response.data.bestPrice) {
      return Err(
        makeSwapErrorRight({
          message: 'No best price route specified',
          code: TradeQuoteError.InvalidResponse,
        }),
      )
    }

    return Ok(response.data)
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: 'Unexpected error fetching Bebop quote',
        cause: error,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
}

export const fetchBebopPrice = ({
  buyAsset,
  sellAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  affiliateBps,
  apiKey,
}: {
  buyAsset: Asset
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  affiliateBps?: string
  apiKey: string
}): Promise<Result<BebopQuoteResponse, SwapErrorRight>> => {
  const DUMMY_TAKER = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address

  return fetchBebopQuote({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sellAddress: DUMMY_TAKER,
    slippageTolerancePercentageDecimal: '0.01',
    affiliateBps,
    apiKey,
  })
}
