import type { AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { bn, bnOrZero } from '@shapeshiftoss/chain-adapters'
import type {
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUtxoTradeQuoteInput,
  ProtocolFee,
} from '@shapeshiftoss/swapper'
import {
  makeSwapErrorRight,
  type SwapErrorRight,
  SwapperName,
  TradeQuoteError,
} from '@shapeshiftoss/swapper'
import { Err, Ok, type Result } from '@sniptt/monads'
import { getConfig } from 'config'
import { getDefaultSlippageDecimalPercentageForSwapper } from 'constants/constants'
import { v4 as uuid } from 'uuid'
import { baseUnitToPrecision, convertPrecision } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { getThorTxInfo as getEvmThorTxInfo } from 'lib/swapper/swappers/ThorchainSwapper/evm/utils/getThorTxData'
import { getThorTxInfo as getUtxoThorTxInfo } from 'lib/swapper/swappers/ThorchainSwapper/utxo/utils/getThorTxData'
import { assertUnreachable, isFulfilled, isRejected } from 'lib/utils'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'
import { THOR_PRECISION } from 'lib/utils/thorchain/constants'
import { assertGetUtxoChainAdapter } from 'lib/utils/utxo'
import { convertDecimalPercentageToBasisPoints } from 'state/slices/tradeQuoteSlice/utils'

import {
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_LONGTAIL_SWAP_SOURCE,
  THORCHAIN_STREAM_SWAP_SOURCE,
} from '../constants'
import type {
  ThorEvmTradeQuote,
  ThorTradeQuote,
  ThorTradeUtxoOrCosmosQuote,
} from '../getThorTradeQuote/getTradeQuote'
import type { ThornodeQuoteResponseSuccess } from '../types'
import { addSlippageToMemo } from './addSlippageToMemo'
import { THORCHAIN_FIXED_PRECISION } from './constants'
import { getQuote } from './getQuote/getQuote'
import { TradeType } from './longTailHelpers'
import { getEvmTxFees } from './txFeeHelpers/evmTxFees/getEvmTxFees'
import { getUtxoTxFees } from './txFeeHelpers/utxoTxFees/getUtxoTxFees'

export const getL1quote = async (
  input: GetTradeQuoteInput,
  streamingInterval: number,
  tradeType: TradeType,
): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    accountNumber,
    receiveAddress,
    affiliateBps: requestedAffiliateBps,
    potentialAffiliateBps,
  } = input

  const { chainNamespace } = fromAssetId(sellAsset.assetId)

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Thorchain)

  const inputSlippageBps = convertDecimalPercentageToBasisPoints(slippageTolerancePercentageDecimal)

  const maybeSwapQuote = await getQuote({
    sellAsset,
    buyAssetId: buyAsset.assetId,
    sellAmountCryptoBaseUnit,
    receiveAddress,
    streaming: false,
    affiliateBps: requestedAffiliateBps,
  })

  if (maybeSwapQuote.isErr()) return Err(maybeSwapQuote.unwrapErr())
  const swapQuote = maybeSwapQuote.unwrap()

  const maybeStreamingSwapQuote = getConfig().REACT_APP_FEATURE_THOR_SWAP_STREAMING_SWAPS
    ? await getQuote({
        sellAsset,
        buyAssetId: buyAsset.assetId,
        sellAmountCryptoBaseUnit,
        receiveAddress,
        streaming: true,
        affiliateBps: requestedAffiliateBps,
        streamingInterval,
      })
    : undefined

  if (maybeStreamingSwapQuote?.isErr()) return Err(maybeStreamingSwapQuote.unwrapErr())
  const streamingSwapQuote = maybeStreamingSwapQuote?.unwrap()

  // recommended_min_amount_in should be the same value for both types of swaps
  const recommendedMinimumCryptoBaseUnit = swapQuote.recommended_min_amount_in
    ? convertPrecision({
        value: swapQuote.recommended_min_amount_in,
        inputExponent: THORCHAIN_FIXED_PRECISION,
        outputExponent: sellAsset.precision,
      }).toFixed()
    : '0'

  const getRouteValues = (quote: ThornodeQuoteResponseSuccess, isStreaming: boolean) => {
    const source = (() => {
      if (isStreaming && tradeType === TradeType.L1ToL1) return THORCHAIN_STREAM_SWAP_SOURCE
      if (
        isStreaming &&
        [TradeType.L1ToLongTail, TradeType.LongTailToL1, TradeType.LongTailToLongTail].includes(
          tradeType,
        )
      )
        return THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE
      if (
        !isStreaming &&
        [TradeType.L1ToLongTail, TradeType.LongTailToL1, TradeType.LongTailToLongTail].includes(
          tradeType,
        )
      )
        return THORCHAIN_LONGTAIL_SWAP_SOURCE
      return SwapperName.Thorchain
    })()

    return {
      source,
      quote,
      expectedAmountOutThorBaseUnit: bnOrZero(quote.expected_amount_out).toFixed(),
      isStreaming,
      affiliateBps: quote.fees.affiliate === '0' ? '0' : requestedAffiliateBps,
      // always use TC auto stream quote (0 limit = 5bps - 50bps, sometimes up to 100bps)
      // see: https://discord.com/channels/838986635756044328/1166265575941619742/1166500062101250100
      slippageBps: isStreaming ? bn(0) : inputSlippageBps,
      estimatedExecutionTimeMs: quote.total_swap_seconds
        ? 1000 * quote.total_swap_seconds
        : undefined,
    }
  }

  const perRouteValues = [getRouteValues(swapQuote, false)]

  if (
    streamingSwapQuote &&
    swapQuote.expected_amount_out !== streamingSwapQuote.expected_amount_out
  ) {
    perRouteValues.push(getRouteValues(streamingSwapQuote, true))
  }

  const getRouteRate = (expectedAmountOutThorBaseUnit: string) => {
    const sellAmountCryptoPrecision = baseUnitToPrecision({
      value: sellAmountCryptoBaseUnit,
      inputExponent: sellAsset.precision,
    })
    // All thorchain pool amounts are base 8 regardless of token precision
    const sellAmountCryptoThorBaseUnit = bn(toBaseUnit(sellAmountCryptoPrecision, THOR_PRECISION))

    return bnOrZero(expectedAmountOutThorBaseUnit).div(sellAmountCryptoThorBaseUnit).toFixed()
  }

  const getRouteBuyAmountBeforeFeesCryptoBaseUnit = (quote: ThornodeQuoteResponseSuccess) => {
    const buyAmountBeforeFeesCryptoThorPrecision = bn(quote.expected_amount_out).plus(
      quote.fees.total,
    )
    return toBaseUnit(
      fromBaseUnit(buyAmountBeforeFeesCryptoThorPrecision, THORCHAIN_FIXED_PRECISION),
      buyAsset.precision,
    )
  }

  const getProtocolFees = (quote: ThornodeQuoteResponseSuccess) => {
    // THORChain fees consist of liquidity, outbound, and affiliate fees
    // For the purpose of displaying protocol fees to the user, we don't need the latter
    // The reason for that is the affiliate fee is shown as its own "ShapeShift fee" section
    // Including the affiliate fee here would result in the protocol fee being wrong, as affiliate fees would be
    // double accounted for both in protocol fees, and affiliate fee
    const buyAssetTradeFeeBuyAssetCryptoThorPrecision = bnOrZero(quote.fees.total).minus(
      quote.fees.affiliate,
    )
    const buyAssetTradeFeeBuyAssetCryptoBaseUnit = convertPrecision({
      value: buyAssetTradeFeeBuyAssetCryptoThorPrecision,
      inputExponent: THORCHAIN_FIXED_PRECISION,
      outputExponent: buyAsset.precision,
    })

    const protocolFees: Record<AssetId, ProtocolFee> = {}

    if (!buyAssetTradeFeeBuyAssetCryptoBaseUnit.isZero()) {
      protocolFees[buyAsset.assetId] = {
        amountCryptoBaseUnit: buyAssetTradeFeeBuyAssetCryptoBaseUnit.toString(),
        requiresBalance: false,
        asset: buyAsset,
      }
    }

    return protocolFees
  }

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm: {
      const sellAdapter = assertGetEvmChainAdapter(sellAsset.chainId)
      const { networkFeeCryptoBaseUnit } = await getEvmTxFees({
        adapter: sellAdapter,
        supportsEIP1559: (input as GetEvmTradeQuoteInput).supportsEIP1559,
      })

      const maybeRoutes = await Promise.allSettled(
        perRouteValues.map(
          async ({
            source,
            quote,
            expectedAmountOutThorBaseUnit,
            isStreaming,
            estimatedExecutionTimeMs,
            affiliateBps,
            slippageBps,
          }): Promise<ThorEvmTradeQuote> => {
            const rate = getRouteRate(expectedAmountOutThorBaseUnit)
            const buyAmountBeforeFeesCryptoBaseUnit =
              getRouteBuyAmountBeforeFeesCryptoBaseUnit(quote)

            const updatedMemo = addSlippageToMemo({
              expectedAmountOutThorBaseUnit,
              quotedMemo: quote.memo,
              slippageBps,
              chainId: sellAsset.chainId,
              affiliateBps,
              isStreaming,
            })
            const { data, router, vault } = await getEvmThorTxInfo({
              sellAsset,
              sellAmountCryptoBaseUnit,
              memo: updatedMemo,
              expiry: quote.expiry,
            })

            const buyAmountAfterFeesCryptoBaseUnit = convertPrecision({
              value: expectedAmountOutThorBaseUnit,
              inputExponent: THORCHAIN_FIXED_PRECISION,
              outputExponent: buyAsset.precision,
            }).toFixed()

            return {
              id: uuid(),
              memo: updatedMemo,
              receiveAddress,
              affiliateBps,
              potentialAffiliateBps,
              isStreaming,
              recommendedMinimumCryptoBaseUnit,
              slippageTolerancePercentageDecimal: isStreaming
                ? undefined
                : slippageTolerancePercentageDecimal,
              rate,
              data,
              router,
              vault,
              expiry: quote.expiry,
              tradeType: tradeType ?? TradeType.L1ToL1,
              steps: [
                {
                  estimatedExecutionTimeMs,
                  rate,
                  sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
                  buyAmountBeforeFeesCryptoBaseUnit,
                  buyAmountAfterFeesCryptoBaseUnit,
                  source,
                  buyAsset,
                  sellAsset,
                  accountNumber,
                  allowanceContract: router,
                  feeData: {
                    networkFeeCryptoBaseUnit,
                    protocolFees: getProtocolFees(quote),
                  },
                },
              ],
            }
          },
        ),
      )

      const routes = maybeRoutes.filter(isFulfilled).map(maybeRoute => maybeRoute.value)

      // if no routes succeeded, return failure from swapper
      if (!routes.length)
        return Err(
          makeSwapErrorRight({
            message: 'Unable to create any routes',
            code: TradeQuoteError.UnsupportedTradePair,
            cause: maybeRoutes.filter(isRejected).map(maybeRoute => maybeRoute.reason),
          }),
        )

      // otherwise, return all that succeeded
      return Ok(routes)
    }

    case CHAIN_NAMESPACE.Utxo: {
      const maybeRoutes = await Promise.allSettled(
        perRouteValues.map(
          async ({
            source,
            quote,
            expectedAmountOutThorBaseUnit,
            isStreaming,
            estimatedExecutionTimeMs,
            affiliateBps,
            slippageBps,
          }): Promise<ThorTradeUtxoOrCosmosQuote> => {
            const rate = getRouteRate(expectedAmountOutThorBaseUnit)
            const buyAmountBeforeFeesCryptoBaseUnit =
              getRouteBuyAmountBeforeFeesCryptoBaseUnit(quote)

            const updatedMemo = addSlippageToMemo({
              expectedAmountOutThorBaseUnit,
              quotedMemo: quote.memo,
              slippageBps,
              isStreaming,
              chainId: sellAsset.chainId,
              affiliateBps,
            })
            const { vault, opReturnData, pubkey } = await getUtxoThorTxInfo({
              sellAsset,
              xpub: (input as GetUtxoTradeQuoteInput).xpub,
              memo: updatedMemo,
            })

            const sellAdapter = assertGetUtxoChainAdapter(sellAsset.chainId)
            const feeData = await getUtxoTxFees({
              sellAmountCryptoBaseUnit,
              vault,
              opReturnData,
              pubkey,
              sellAdapter,
              protocolFees: getProtocolFees(quote),
            })

            const buyAmountAfterFeesCryptoBaseUnit = convertPrecision({
              value: expectedAmountOutThorBaseUnit,
              inputExponent: THORCHAIN_FIXED_PRECISION,
              outputExponent: buyAsset.precision,
            }).toFixed()

            return {
              id: uuid(),
              memo: updatedMemo,
              receiveAddress,
              affiliateBps,
              potentialAffiliateBps,
              isStreaming,
              recommendedMinimumCryptoBaseUnit,
              tradeType: tradeType ?? TradeType.L1ToL1,
              expiry: quote.expiry,
              slippageTolerancePercentageDecimal: isStreaming
                ? undefined
                : slippageTolerancePercentageDecimal,
              rate,
              steps: [
                {
                  estimatedExecutionTimeMs,
                  rate,
                  sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
                  buyAmountBeforeFeesCryptoBaseUnit,
                  buyAmountAfterFeesCryptoBaseUnit,
                  source,
                  buyAsset,
                  sellAsset,
                  accountNumber,
                  allowanceContract: '0x0', // not applicable to UTXOs
                  feeData,
                },
              ],
            }
          },
        ),
      )

      const routes = maybeRoutes.filter(isFulfilled).map(maybeRoute => maybeRoute.value)

      // if no routes succeeded, return failure from swapper
      if (!routes.length)
        return Err(
          makeSwapErrorRight({
            message: 'Unable to create any routes',
            code: TradeQuoteError.UnsupportedTradePair,
            cause: maybeRoutes.filter(isRejected).map(maybeRoute => maybeRoute.reason),
          }),
        )

      // otherwise, return all that succeeded
      return Ok(routes)
    }

    case CHAIN_NAMESPACE.CosmosSdk: {
      const sellAdapter = assertGetCosmosSdkChainAdapter(sellAsset.chainId)
      const feeData = await sellAdapter.getFeeData({})

      return Ok(
        perRouteValues.map(
          ({
            source,
            quote,
            expectedAmountOutThorBaseUnit,
            isStreaming,
            estimatedExecutionTimeMs,
            affiliateBps,
            slippageBps,
          }): ThorTradeUtxoOrCosmosQuote => {
            const rate = getRouteRate(expectedAmountOutThorBaseUnit)
            const buyAmountBeforeFeesCryptoBaseUnit =
              getRouteBuyAmountBeforeFeesCryptoBaseUnit(quote)

            const buyAmountAfterFeesCryptoBaseUnit = convertPrecision({
              value: expectedAmountOutThorBaseUnit,
              inputExponent: THORCHAIN_FIXED_PRECISION,
              outputExponent: buyAsset.precision,
            }).toFixed()

            const updatedMemo = addSlippageToMemo({
              expectedAmountOutThorBaseUnit,
              quotedMemo: quote.memo,
              slippageBps,
              isStreaming,
              chainId: sellAsset.chainId,
              affiliateBps,
            })

            return {
              id: uuid(),
              memo: updatedMemo,
              receiveAddress,
              affiliateBps,
              potentialAffiliateBps,
              isStreaming,
              recommendedMinimumCryptoBaseUnit,
              expiry: quote.expiry,
              slippageTolerancePercentageDecimal: isStreaming
                ? undefined
                : slippageTolerancePercentageDecimal,
              rate,
              tradeType: tradeType ?? TradeType.L1ToL1,
              steps: [
                {
                  estimatedExecutionTimeMs,
                  rate,
                  sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
                  buyAmountBeforeFeesCryptoBaseUnit,
                  buyAmountAfterFeesCryptoBaseUnit,
                  source,
                  buyAsset,
                  sellAsset,
                  accountNumber,
                  allowanceContract: '0x0', // not applicable to cosmos
                  feeData: {
                    networkFeeCryptoBaseUnit: feeData.fast.txFee,
                    protocolFees: getProtocolFees(quote),
                    chainSpecific: {
                      estimatedGasCryptoBaseUnit: feeData.fast.chainSpecific.gasLimit,
                    },
                  },
                },
              ],
            }
          },
        ),
      )
    }

    default:
      assertUnreachable(chainNamespace)
  }
}
