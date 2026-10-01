import { solAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { bn, bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { Address } from 'viem'
import { getAddress } from 'viem'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { getTreasuryAddressFromChainId } from '../../../utils/helpers'
import type { BebopQuoteResponse, BebopSolanaQuoteResponse, BebopSupportedChainId } from '../types'
import { chainIdToBebopChain } from '../types'
import { bebopServiceFactory } from './bebopService'
import { assetIdToBebopSolanaToken, assetIdToBebopToken } from './helpers'

// PMM charges the fee set against our api key, which nets exactly this bps
const BEBOP_PMM_AFFILIATE_BPS = '60'

const isPmmEligible = (affiliateBps: string | undefined) =>
  bnOrZero(affiliateBps).eq(BEBOP_PMM_AFFILIATE_BPS)

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
    const slippagePercentage = bn(slippageTolerancePercentageDecimal).times(100).toNumber()

    const baseParams = {
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
    }

    const jamParams = new URLSearchParams(baseParams)

    // Without an explicit fee JAM charges our api key's flat fee, so 1 bps is the lowest it can go
    jamParams.set('fee', affiliateBps && bnOrZero(affiliateBps).gt(0) ? affiliateBps : '1')
    jamParams.set('fee_recipient', getAddress(getTreasuryAddressFromChainId(buyAsset.chainId)))

    const service = bebopServiceFactory({ apiKey })

    const requests = [
      service.get<BebopQuoteResponse>(`https://api.bebop.xyz/jam/${chainName}/v2/quote`, {
        params: jamParams,
      }),
    ]

    if (isPmmEligible(affiliateBps)) {
      requests.push(
        service.get<BebopQuoteResponse>(`https://api.bebop.xyz/pmm/${chainName}/v3/quote`, {
          params: new URLSearchParams(baseParams),
        }),
      )
    }

    const maybeResponses = await Promise.all(requests)

    if (maybeResponses.every(maybeResponse => maybeResponse.isErr())) {
      return Err(
        makeSwapErrorRight({
          message: 'Failed to fetch quote from Bebop',
          cause: maybeResponses[0].unwrapErr().cause,
          code: TradeQuoteError.QueryFailed,
        }),
      )
    }

    const quotes = maybeResponses
      .filter(maybeResponse => maybeResponse.isOk())
      .map(maybeResponse => maybeResponse.unwrap().data)
      .filter(quote => Boolean(quote.tx?.data))

    if (!quotes.length) {
      return Err(
        makeSwapErrorRight({
          message: 'No route available',
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    const getBuyAmount = (quote: BebopQuoteResponse) =>
      bnOrZero(Object.values(quote.buyTokens)[0]?.amount)

    const bestQuote = quotes.reduce((best, quote) =>
      getBuyAmount(quote).gt(getBuyAmount(best)) ? quote : best,
    )

    return Ok(bestQuote)
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
    if (!isPmmEligible(affiliateBps)) {
      return Err(
        makeSwapErrorRight({
          message: 'Bebop Solana is PMM only and cannot take the requested bps',
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    // Bebop's Solana routes don't wrap native SOL on the input side, so selling native SOL
    // always fails on-chain. Reject up front instead of returning an unexecutable quote.
    if (sellAsset.assetId === solAssetId) {
      return Err(
        makeSwapErrorRight({
          message: 'Bebop Solana cannot sell native SOL',
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    const sellToken = assetIdToBebopSolanaToken(sellAsset.assetId)
    const buyToken = assetIdToBebopSolanaToken(buyAsset.assetId)
    const sellAmountFormatted = bn(sellAmountIncludingProtocolFeesCryptoBaseUnit).toFixed(0)
    const slippagePercentage = bn(slippageTolerancePercentageDecimal).times(100).toNumber()

    const params = new URLSearchParams({
      sell_tokens: sellToken,
      buy_tokens: buyToken,
      sell_amounts: sellAmountFormatted,
      taker_address: takerAddress,
      receiver_address: receiverAddress,
      slippage: slippagePercentage.toString(),
      approval_type: 'Standard',
      skip_validation: 'false',
      gasless: 'true',
      source: 'shapeshift',
    })

    const maybeResponse = await bebopServiceFactory({ apiKey }).get<BebopSolanaQuoteResponse>(
      'https://api.bebop.xyz/pmm/solana/v3/quote',
      { params },
    )

    if (maybeResponse.isErr()) {
      const err = maybeResponse.unwrapErr()
      return Err(
        makeSwapErrorRight({
          message: 'Failed to fetch quote from Bebop Solana',
          cause: err.cause,
          code: TradeQuoteError.QueryFailed,
        }),
      )
    }

    const response = maybeResponse.unwrap()

    if (response.data.status !== 'QUOTE_SUCCESS') {
      return Err(
        makeSwapErrorRight({
          message: `Bebop Solana quote not executable: ${response.data.status}`,
          code: TradeQuoteError.InvalidResponse,
        }),
      )
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
