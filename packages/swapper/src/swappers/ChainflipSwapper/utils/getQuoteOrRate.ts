import { BigAmount, bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosError } from 'axios'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  CommonTradeQuoteInput,
  GetTradeRateInput,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
  TradeRate,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { createTradeAmountTooSmallErr, makeSwapErrorRight } from '../../../utils'
import { buildAffiliateFee } from '../../utils/affiliateFee'
import { CHAINFLIP_DCA_QUOTE } from '../constants'
import type { ChainflipBaasQuoteQuote } from '../models'
import type { ChainflipMetadata } from '../types'
import { chainflipService } from './chainflipService'
import {
  assertValidTrade,
  calculateChainflipMinPrice,
  getChainFlipIdFromAssetId,
  getChainflipRate,
  getChainFlipSwap,
  getMaxBoostFee,
  getProtocolFees,
  getStepFeeData,
  getSwapSource,
  getTransactionData,
} from './helpers'

export const getQuoteOrRate = async (
  input: GetTradeRateInput | CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[] | TradeRate[], SwapErrorRight>> => {
  const brokerUrl = deps.config.VITE_CHAINFLIP_API_URL
  const apiKey = deps.config.VITE_CHAINFLIP_API_KEY

  const {
    accountNumber,
    receiveAddress,
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    affiliateBps,
    quoteOrRate,
  } = input

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

  const ratesOrQuotes = []
  for (const quote of quotes) {
    if (!quote.type) throw new Error('Missing quote type')

    const isStreaming = quote.type === CHAINFLIP_DCA_QUOTE
    if (isStreaming && !deps.config.VITE_FEATURE_CHAINFLIP_SWAP_DCA) continue

    const buildRateOrQuote = async (
      variantQuote: ChainflipBaasQuoteQuote,
      isBoosted: boolean,
    ): Promise<Result<TradeQuote | TradeRate, SwapErrorRight>> => {
      const rate = getChainflipRate({
        sellAmountCryptoBaseUnit: variantQuote.ingressAmountNative,
        buyAmountCryptoBaseUnit: variantQuote.egressAmountNative,
        sellAsset,
        buyAsset,
      })

      const buyAmountAfterFeesCryptoBaseUnit = variantQuote.egressAmountNative ?? '0'
      const sellAmountIncludingProtocolFeesCryptoBaseUnit = variantQuote.ingressAmountNative ?? '0'

      const streamingChunkValue = (value: number | null | undefined) =>
        isStreaming ? value ?? undefined : undefined

      const maxBoostFee = isBoosted ? getMaxBoostFee(sellAsset.assetId) : 0
      const numberOfChunks = streamingChunkValue(variantQuote.numberOfChunks)
      const chunkIntervalBlocks = streamingChunkValue(variantQuote.chunkIntervalBlocks)

      const protocolFees = getProtocolFees({
        quote: variantQuote,
        sellAsset,
        buyAsset,
        sourceAsset,
        destinationAsset,
      })

      const slippageTolerancePercentageDecimal =
        input.slippageTolerancePercentageDecimal ??
        getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Chainflip)

      try {
        const { chainflipSpecific, swapperMetadata, transactionData, feeData } =
          await (async () => {
            if (quoteOrRate === 'rate') {
              const feeData = await getStepFeeData({
                deps,
                input,
                sellAsset,
                sellAmountCryptoBaseUnit: input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
                to: input.sendAddress,
                transactionData: undefined,
              })
              return { feeData }
            }

            if (input.accountNumber === undefined) throw new Error('accountNumber is required')
            if (!input.sendAddress) throw new Error('sendAddress is required')
            if (!input.receiveAddress) throw new Error('receiveAddress is required')

            const minimumPrice = calculateChainflipMinPrice({
              slippageTolerancePercentageDecimal,
              sellAsset,
              buyAsset,
              buyAmountAfterFeesCryptoBaseUnit,
              sellAmountIncludingProtocolFeesCryptoBaseUnit,
            })

            const maybeSwapResponse = await getChainFlipSwap({
              brokerUrl,
              apiKey,
              sourceAsset,
              minimumPrice,
              destinationAsset,
              destinationAddress: input.receiveAddress,
              refundAddress: input.sendAddress,
              maxBoostFee,
              numberOfChunks,
              chunkIntervalBlocks,
              commissionBps: parseInt(affiliateBps),
            })

            if (maybeSwapResponse.isErr()) {
              console.error(maybeSwapResponse.unwrapErr().cause as AxiosError<any, any>)
              throw new Error('Error fetching Chainflip swap')
            }

            const { data: swapResponse } = maybeSwapResponse.unwrap()
            const { address: depositAddress, id: swapId } = swapResponse

            if (!swapId || !depositAddress) throw new Error('Invalid swap response')

            const transactionData = await getTransactionData({
              deps,
              sellAsset,
              depositAddress,
              sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
              from: input.sendAddress,
            })

            const feeData = await getStepFeeData({
              deps,
              input,
              sellAsset,
              sellAmountCryptoBaseUnit: input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
              to: depositAddress,
              transactionData,
            })

            return {
              chainflipSpecific: { depositAddress },
              swapperMetadata: { name: 'chainflip', swapId } satisfies ChainflipMetadata,
              transactionData,
              feeData,
            }
          })()

        return Ok({
          id: uuid(),
          rate,
          receiveAddress,
          quoteOrRate,
          affiliateBps,
          isStreaming,
          slippageTolerancePercentageDecimal,
          swapperName: SwapperName.Chainflip,
          steps: [
            {
              // Not a real pre-fee amount, but an input/output calc prorated to the buy asset price to determine price impact
              buyAmountBeforeFeesCryptoBaseUnit: BigAmount.fromPrecision({
                value: bnOrZero(variantQuote.ingressAmount).times(
                  bnOrZero(variantQuote.estimatedPrice),
                ),
                precision: buyAsset.precision,
              }).toBaseUnit(),
              buyAmountAfterFeesCryptoBaseUnit,
              sellAmountIncludingProtocolFeesCryptoBaseUnit,
              feeData: { ...feeData, protocolFees },
              rate,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              source: getSwapSource(variantQuote.type!, isBoosted),
              buyAsset,
              sellAsset,
              accountNumber,
              allowanceContract: '',
              estimatedExecutionTimeMs:
                ((variantQuote.estimatedDurationsSeconds?.deposit ?? 0) +
                  (variantQuote.estimatedDurationsSeconds?.swap ?? 0)) *
                1000,
              chainflipSpecific,
              swapperMetadata,
              transactionData,
              affiliateFee: buildAffiliateFee({
                strategy: 'buy_asset',
                affiliateBps,
                sellAsset,
                buyAsset,
                sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
                buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
              }),
            },
          ],
        } as TradeQuote | TradeRate)
      } catch (err) {
        return Err(
          makeSwapErrorRight({
            message: (err as Error).message,
            code: TradeQuoteError.UnknownError,
          }),
        )
      }
    }

    const { boostQuote } = quote

    if (boostQuote && boostQuote.ingressAmountNative && boostQuote.egressAmountNative) {
      const maybeBoost = await buildRateOrQuote(boostQuote, true)
      if (maybeBoost.isErr()) return Err(maybeBoost.unwrapErr())
      ratesOrQuotes.push(maybeBoost.unwrap())
    }

    const maybeRegular = await buildRateOrQuote(quote, false)
    if (maybeRegular.isErr()) return Err(maybeRegular.unwrapErr())
    ratesOrQuotes.push(maybeRegular.unwrap())
  }

  return Ok(ratesOrQuotes as TradeQuote[] | TradeRate[])
}
