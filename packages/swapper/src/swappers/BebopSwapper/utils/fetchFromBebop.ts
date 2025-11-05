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
    // Get Bebop-formatted token addresses (checksummed)
    const sellToken = assetIdToBebopToken(sellAsset.assetId)
    const buyToken = assetIdToBebopToken(buyAsset.assetId)

    // Checksum the wallet address - Bebop requires checksummed addresses
    const checksummedSellAddress = getAddress(sellAddress)

    // Get chain name for Bebop API
    const chainName = getBebopChainName(sellAsset.chainId)

    // Format sell amount (Bebop expects integers without decimals)
    const sellAmountFormatted = formatBebopAmount(sellAmountIncludingProtocolFeesCryptoBaseUnit)

    // Calculate slippage in basis points
    const slippageBps = getSlippageTolerance(slippageTolerancePercentageDecimal)

    // Build API URL
    const url = buildBebopApiUrl(chainName, 'quote')

    // Build query parameters
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

    // Add affiliate fee if provided (in basis points, same format as affiliateBps)
    if (affiliateBps && affiliateBps !== '0') {
      params.set('fee', affiliateBps)
    }

    // Create service instance
    const bebopService = bebopServiceFactory({ apiKey })

    // Make API request
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

    // Validate best price exists
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

// For price-only requests (no wallet connected), we still use quote endpoint
// but with a valid dummy address (zero address doesn't work with Bebop)
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
  // Use a valid dummy taker address when wallet isn't connected
  // Bebop requires a valid address format, zero address may not work
  const DUMMY_TAKER = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address // Vitalik's address as placeholder

  return fetchBebopQuote({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sellAddress: DUMMY_TAKER,
    slippageTolerancePercentageDecimal: '0.01', // Default 1% for price quotes
    affiliateBps, // Pass through affiliate fees to show realistic rate
    apiKey,
  })
}
