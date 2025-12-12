import type { Asset } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { Address } from 'viem'
import { getAddress } from 'viem'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { BebopQuoteResponse, BebopSolanaQuoteResponse, BebopSupportedChainId } from '../types'
import { BEBOP_DUMMY_ADDRESS, BEBOP_SOLANA_DUMMY_ADDRESS, chainIdToBebopChain } from '../types'
import { bebopServiceFactory } from './bebopService'
import { assetIdToBebopSolanaToken, assetIdToBebopToken } from './helpers/helpers'

export const fetchBebopQuote = async ({
  buyAsset,
  sellAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  takerAddress,
  receiverAddress,
  slippageTolerancePercentageDecimal,
  affiliateBps,
  apiKey,
}: {
  buyAsset: Asset
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  takerAddress: Address
  receiverAddress: Address
  slippageTolerancePercentageDecimal: string
  affiliateBps?: string
  apiKey: string
}): Promise<Result<BebopQuoteResponse, SwapErrorRight>> => {
  try {
    const sellToken = assetIdToBebopToken(sellAsset.assetId)
    const buyToken = assetIdToBebopToken(buyAsset.assetId)
    const checksummedTakerAddress = getAddress(takerAddress)
    const checksummedReceiverAddress = getAddress(receiverAddress)
    const chainName = chainIdToBebopChain[sellAsset.chainId as BebopSupportedChainId]
    const sellAmountFormatted = bn(sellAmountIncludingProtocolFeesCryptoBaseUnit).toFixed(0)
    // Bebop API expects slippage as percentage (not basis points like other APIs)
    // e.g. 0.3% → send as 0.3, not 30
    // See: https://api.bebop.xyz/pmm/ethereum/docs#/v3/quote_v3_quote_get
    const slippagePercentage = bn(slippageTolerancePercentageDecimal ?? 0.003)
      .times(100)
      .toNumber()
    const url = `https://api.bebop.xyz/router/${chainName}/v1/quote`

    const params = new URLSearchParams({
      sell_tokens: sellToken,
      buy_tokens: buyToken,
      sell_amounts: sellAmountFormatted,
      taker_address: checksummedTakerAddress,
      receiver_address: checksummedReceiverAddress,
      slippage: slippagePercentage.toString(),
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
  receiveAddress,
  affiliateBps,
  apiKey,
}: {
  buyAsset: Asset
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  receiveAddress: string | undefined
  affiliateBps?: string
  apiKey: string
}): Promise<Result<BebopQuoteResponse, SwapErrorRight>> => {
  const address = (receiveAddress as Address | undefined) || BEBOP_DUMMY_ADDRESS

  return fetchBebopQuote({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    takerAddress: address,
    receiverAddress: address,
    slippageTolerancePercentageDecimal: '0.01',
    affiliateBps,
    apiKey,
  })
}

export const fetchBebopSolanaQuote = async ({
  buyAsset,
  sellAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  takerAddress,
  receiverAddress,
  slippageTolerancePercentageDecimal,
  affiliateBps,
  apiKey,
}: {
  buyAsset: Asset
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  takerAddress: string
  receiverAddress: string
  slippageTolerancePercentageDecimal: string
  affiliateBps?: string
  apiKey: string
}): Promise<Result<BebopSolanaQuoteResponse, SwapErrorRight>> => {
  try {
    const sellToken = assetIdToBebopSolanaToken(sellAsset.assetId)
    const buyToken = assetIdToBebopSolanaToken(buyAsset.assetId)

    const sellAmountFormatted = bn(sellAmountIncludingProtocolFeesCryptoBaseUnit).toFixed(0)
    const slippagePercentage = bn(slippageTolerancePercentageDecimal ?? 0.003)
      .times(100)
      .toNumber()

    const url = 'https://api.bebop.xyz/pmm/solana/v3/quote'

    const params = new URLSearchParams({
      sell_tokens: sellToken,
      buy_tokens: buyToken,
      sell_amounts: sellAmountFormatted,
      taker_address: takerAddress,
      receiver_address: receiverAddress,
      slippage: slippagePercentage.toString(),
      approval_type: 'Standard',
      skip_validation: 'false',
      gasless: 'false',
      source: 'shapeshift',
    })

    if (affiliateBps && affiliateBps !== '0') {
      params.set('fee', affiliateBps)
    }

    console.log('[Bebop Solana Fetch] API request:', JSON.stringify({
      url: `${url}?${params}`,
      sellToken,
      buyToken,
      sellAmount: sellAmountFormatted,
      takerAddress,
      receiverAddress,
      slippage: slippagePercentage,
      affiliateBps,
    }))

    const bebopService = bebopServiceFactory({ apiKey })
    const maybeResponse = await bebopService.get<BebopSolanaQuoteResponse>(`${url}?${params}`)

    if (maybeResponse.isErr()) {
      console.log('[Bebop Solana Fetch] API error:', JSON.stringify({
        error: maybeResponse.unwrapErr(),
      }))
      return Err(
        makeSwapErrorRight({
          message: 'Failed to fetch quote from Bebop Solana',
          cause: maybeResponse.unwrapErr().cause,
          code: TradeQuoteError.QueryFailed,
        }),
      )
    }

    const response = maybeResponse.unwrap()

    console.log('[Bebop Solana Fetch] API response:', JSON.stringify({
      quoteId: response.data.quoteId,
      status: response.data.status,
      taker: response.data.taker,
      receiver: response.data.receiver,
      expiry: response.data.expiry,
      gasFee: response.data.gasFee,
      solanaTxLength: response.data.solana_tx?.length,
      blockhash: response.data.blockhash,
      priceImpact: response.data.priceImpact,
    }))

    if (response.data.status !== 'QUOTE_INDIC_ROUTE') {
      console.warn('[Bebop Solana Fetch] Expected QUOTE_INDIC_ROUTE for gasless=false, got:', response.data.status)
    }

    if (!response.data.solana_tx) {
      return Err(
        makeSwapErrorRight({
          message: 'Missing solana_tx in response',
          code: TradeQuoteError.InvalidResponse,
        }),
      )
    }

    return Ok(response.data)
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: 'Unexpected error fetching Bebop Solana quote',
        cause: error,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
}

export const fetchBebopSolanaPrice = ({
  buyAsset,
  sellAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  receiveAddress,
  affiliateBps,
  apiKey,
}: {
  buyAsset: Asset
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  receiveAddress: string | undefined
  affiliateBps?: string
  apiKey: string
}): Promise<Result<BebopSolanaQuoteResponse, SwapErrorRight>> => {
  const address = receiveAddress || BEBOP_SOLANA_DUMMY_ADDRESS

  return fetchBebopSolanaQuote({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    takerAddress: address,
    receiverAddress: address,
    slippageTolerancePercentageDecimal: '0.01',
    affiliateBps,
    apiKey,
  })
}
