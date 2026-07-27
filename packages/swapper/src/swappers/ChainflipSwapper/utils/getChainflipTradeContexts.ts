import { BigAmount, bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosError } from 'axios'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  TradeCommon,
  TradeStepCommon,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { createTradeAmountTooSmallErr, makeSwapErrorRight } from '../../../utils'
import { buildAffiliateFee } from '../../../utils/affiliateFee'
import { CHAINFLIP_DCA_QUOTE } from '../constants'
import type { ChainflipBaasQuoteQuote } from '../models'
import type { ChainflipTradeQuoteInput, ChainflipTradeRateInput } from '../types'
import { chainflipService } from './chainflipService'
import type { GetChainflipStepDataArgs } from './getChainflipStepData'
import {
  assertValidTrade,
  getChainFlipIdFromAssetId,
  getChainflipRate,
  getMaxBoostFee,
  getProtocolFees,
  getSwapSource,
} from './helpers'

// Chainflip returns multiple trades per request (regular + boost + DCA), so one context per trade
export type ChainflipTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: QuoteFeeData['protocolFees']
  stepDataArgs: Omit<GetChainflipStepDataArgs, 'type' | 'input' | 'depositAddress' | 'from'>
  channelParams: {
    sourceAsset: string
    destinationAsset: string
    maxBoostFee: number
    numberOfChunks: number | undefined
    chunkIntervalBlocks: number | undefined
    buyAmountAfterFeesCryptoBaseUnit: string
  }
}

export const getChainflipTradeContexts = async (
  input: ChainflipTradeQuoteInput | ChainflipTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<ChainflipTradeContext[], SwapErrorRight>> => {
  const brokerUrl = deps.config.VITE_CHAINFLIP_API_URL
  const apiKey = deps.config.VITE_CHAINFLIP_API_KEY

  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit, affiliateBps } = input

  const assertion = assertValidTrade({ sellAsset, buyAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const maybeSourceAsset = await getChainFlipIdFromAssetId({
    assetId: sellAsset.assetId,
    brokerUrl,
  })

  if (maybeSourceAsset.isErr()) return Err(maybeSourceAsset.unwrapErr())
  const sourceAsset = maybeSourceAsset.unwrap()

  const maybeDestinationAsset = await getChainFlipIdFromAssetId({
    assetId: buyAsset.assetId,
    brokerUrl,
  })

  if (maybeDestinationAsset.isErr()) return Err(maybeDestinationAsset.unwrapErr())
  const destinationAsset = maybeDestinationAsset.unwrap()

  const maybeQuoteResponse = await chainflipService.get<ChainflipBaasQuoteQuote[]>(
    `${brokerUrl}/quotes-native` +
      `?apiKey=${apiKey}` +
      `&sourceAsset=${sourceAsset}` +
      `&destinationAsset=${destinationAsset}` +
      `&amount=${sellAmountIncludingProtocolFeesCryptoBaseUnit}` +
      `&commissionBps=${parseInt(affiliateBps)}`,
  )

  if (maybeQuoteResponse.isErr()) {
    const error = maybeQuoteResponse.unwrapErr()
    const cause = error.cause as AxiosError<any, any> | undefined

    const minAmountCryptoBaseUnit = cause?.response?.data?.errors?.minimalAmountNative?.[0]

    if (cause?.response?.status === 400 && minAmountCryptoBaseUnit !== undefined) {
      return Err(
        createTradeAmountTooSmallErr({ assetId: sellAsset.assetId, minAmountCryptoBaseUnit }),
      )
    }

    return Err(
      makeSwapErrorRight({ message: 'Quote request failed', code: TradeQuoteError.NoRouteFound }),
    )
  }

  const { data: quotes } = maybeQuoteResponse.unwrap()

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Chainflip)

  const tradeContexts: ChainflipTradeContext[] = []

  for (const quote of quotes) {
    if (!quote.type) {
      return Err(
        makeSwapErrorRight({
          message: '[getChainflipTradeContext] Missing quote type',
          code: TradeQuoteError.InvalidResponse,
        }),
      )
    }

    const quoteType = quote.type
    const isStreaming = quoteType === CHAINFLIP_DCA_QUOTE
    if (isStreaming && !deps.config.VITE_FEATURE_CHAINFLIP_SWAP_DCA) continue

    // estimatedPrice and type only exist on the parent quote, not the boost variant
    const buildTradeContext = (
      variantQuote: ChainflipBaasQuoteQuote,
      isBoosted: boolean,
    ): ChainflipTradeContext => {
      const rate = getChainflipRate({
        sellAmountCryptoBaseUnit: variantQuote.ingressAmountNative,
        buyAmountCryptoBaseUnit: variantQuote.egressAmountNative,
        sellAsset,
        buyAsset,
      })

      const buyAmountAfterFeesCryptoBaseUnit = variantQuote.egressAmountNative ?? '0'
      const variantSellAmountCryptoBaseUnit = variantQuote.ingressAmountNative ?? '0'

      const streamingChunkValue = (value: number | null | undefined) =>
        isStreaming ? value ?? undefined : undefined

      const protocolFees = getProtocolFees({
        quote: variantQuote,
        sellAsset,
        buyAsset,
        sourceAsset,
        destinationAsset,
      })

      return {
        tradeCommon: {
          id: uuid(),
          rate,
          affiliateBps,
          isStreaming,
          slippageTolerancePercentageDecimal,
          swapperName: SwapperName.Chainflip,
        },
        stepCommon: {
          // Not a real pre-fee amount, but an input/output calc prorated to the buy asset price to determine price impact
          buyAmountBeforeFeesCryptoBaseUnit: BigAmount.fromPrecision({
            value: bnOrZero(variantQuote.ingressAmount).times(bnOrZero(quote.estimatedPrice)),
            precision: buyAsset.precision,
          }).toBaseUnit(),
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit: variantSellAmountCryptoBaseUnit,
          rate,
          source: getSwapSource(quoteType, isBoosted),
          buyAsset,
          sellAsset,
          allowanceContract: '',
          estimatedExecutionTimeMs:
            ((variantQuote.estimatedDurationsSeconds?.deposit ?? 0) +
              (variantQuote.estimatedDurationsSeconds?.swap ?? 0)) *
            1000,
          affiliateFee: buildAffiliateFee({
            strategy: 'buy_asset',
            affiliateBps,
            sellAsset,
            buyAsset,
            sellAmountCryptoBaseUnit: variantSellAmountCryptoBaseUnit,
            buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
          }),
        },
        protocolFees,
        stepDataArgs: {
          deps,
          sellAsset,
          sellAmountCryptoBaseUnit: variantSellAmountCryptoBaseUnit,
        },
        channelParams: {
          sourceAsset,
          destinationAsset,
          maxBoostFee: isBoosted ? getMaxBoostFee(sellAsset.assetId) : 0,
          numberOfChunks: streamingChunkValue(variantQuote.numberOfChunks),
          chunkIntervalBlocks: streamingChunkValue(variantQuote.chunkIntervalBlocks),
          buyAmountAfterFeesCryptoBaseUnit,
        },
      }
    }

    const { boostQuote } = quote

    if (boostQuote && boostQuote.ingressAmountNative && boostQuote.egressAmountNative) {
      tradeContexts.push(buildTradeContext(boostQuote, true))
    }

    tradeContexts.push(buildTradeContext(quote, false))
  }

  return Ok(tradeContexts)
}
