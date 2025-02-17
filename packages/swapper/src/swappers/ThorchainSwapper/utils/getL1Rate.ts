import type { AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import {
  assertUnreachable,
  bn,
  bnOrZero,
  convertDecimalPercentageToBasisPoints,
  convertPrecision,
  fromBaseUnit,
  isFulfilled,
  isRejected,
  toBaseUnit,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../..'
import type {
  GetEvmTradeRateInput,
  GetTradeRateInput,
  GetUtxoTradeQuoteInput,
  GetUtxoTradeRateInput,
  ProtocolFee,
  SwapErrorRight,
  SwapperDeps,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import {
  THOR_PRECISION,
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_LONGTAIL_SWAP_SOURCE,
  THORCHAIN_STREAM_SWAP_SOURCE,
} from '../constants'
import { getThorTxInfo as getEvmThorTxInfo } from '../evm/utils/getThorTxData'
import type {
  ThorEvmTradeRate,
  ThornodeQuoteResponseSuccess,
  ThorTradeRate,
  ThorTradeUtxoOrCosmosRate,
} from '../types'
import { getThorTxInfo as getUtxoThorTxInfo } from '../utxo/utils/getThorTxData'
import { THORCHAIN_FIXED_PRECISION } from './constants'
import { getQuote } from './getQuote/getQuote'
import { TradeType } from './longTailHelpers'
import { getEvmTxFees } from './txFeeHelpers/evmTxFees/getEvmTxFees'
import { getUtxoTxFees } from './txFeeHelpers/utxoTxFees/getUtxoTxFees'

export const getL1Rate = async (
  input: GetTradeRateInput,
  deps: SwapperDeps,
  streamingInterval: number,
  tradeType: TradeType,
): Promise<Result<ThorTradeRate[], SwapErrorRight>> => {
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

  if (chainNamespace === CHAIN_NAMESPACE.Solana) {
    return Err(
      makeSwapErrorRight({
        message: 'Solana is not supported',
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Thorchain)

  const inputSlippageBps = convertDecimalPercentageToBasisPoints(slippageTolerancePercentageDecimal)

  const maybeSwapQuote = await getQuote(
    {
      sellAsset,
      buyAssetId: buyAsset.assetId,
      sellAmountCryptoBaseUnit,
      receiveAddress,
      streaming: false,
      affiliateBps: requestedAffiliateBps,
    },
    deps,
  )

  if (maybeSwapQuote.isErr()) return Err(maybeSwapQuote.unwrapErr())
  const swapQuote = maybeSwapQuote.unwrap()

  const maybeStreamingSwapQuote = deps.config.REACT_APP_FEATURE_THOR_SWAP_STREAMING_SWAPS
    ? await getQuote(
        {
          sellAsset,
          buyAssetId: buyAsset.assetId,
          sellAmountCryptoBaseUnit,
          receiveAddress,
          streaming: true,
          affiliateBps: requestedAffiliateBps,
          streamingInterval,
        },
        deps,
      )
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
    const sellAmountCryptoPrecision = fromBaseUnit(sellAmountCryptoBaseUnit, sellAsset.precision)
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
      const sellAdapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
      const { networkFeeCryptoBaseUnit } = await getEvmTxFees({
        adapter: sellAdapter,
        supportsEIP1559: Boolean((input as GetEvmTradeRateInput).supportsEIP1559),
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
          }): Promise<ThorEvmTradeRate> => {
            const rate = getRouteRate(expectedAmountOutThorBaseUnit)
            const buyAmountBeforeFeesCryptoBaseUnit =
              getRouteBuyAmountBeforeFeesCryptoBaseUnit(quote)

            // No memo returned for rates
            const memo = ''

            const { data, router, vault } = await getEvmThorTxInfo({
              sellAsset,
              sellAmountCryptoBaseUnit,
              memo,
              expiry: quote.expiry,
              config: deps.config,
            })

            const buyAmountAfterFeesCryptoBaseUnit = convertPrecision({
              value: expectedAmountOutThorBaseUnit,
              inputExponent: THORCHAIN_FIXED_PRECISION,
              outputExponent: buyAsset.precision,
            }).toFixed()

            return {
              id: uuid(),
              quoteOrRate: 'rate',
              memo,
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
              swapperName: SwapperName.Thorchain,
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
                  accountNumber: accountNumber!,
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
          }): Promise<ThorTradeUtxoOrCosmosRate> => {
            const rate = getRouteRate(expectedAmountOutThorBaseUnit)
            const buyAmountBeforeFeesCryptoBaseUnit =
              getRouteBuyAmountBeforeFeesCryptoBaseUnit(quote)

            // No memo for trade rates
            const memo = ''

            const feeData = await (async () => {
              // This is a rate without a wallet connected, so we can't get fees
              if (!(input as GetUtxoTradeRateInput).xpub)
                return {
                  networkFeeCryptoBaseUnit: undefined,
                  protocolFees: getProtocolFees(quote),
                }

              // This works by leveraging the xpub if it exists. Even though this is a rate, we absolutely can (and will if possible) pass a xpub
              // However, we run the risk that https://github.com/shapeshift/web/issues/7979 breaks this, since connecting a wallet won't refetch a quote
              // If that becomes an issue we should be able to get a very rough estimation (not taking users' UTXOs into account) without an address
              // using sats per byte and byte size from memo. Yes, we don't have a memo returned, but can build it in-house for this purpose easily.

              const { vault, opReturnData, pubkey } = await getUtxoThorTxInfo({
                sellAsset,
                xpub: (input as unknown as GetUtxoTradeQuoteInput).xpub!,
                memo,
                config: deps.config,
              })

              const sellAdapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)
              return getUtxoTxFees({
                sellAmountCryptoBaseUnit,
                vault,
                opReturnData,
                pubkey,
                sellAdapter,
                protocolFees: getProtocolFees(quote),
              })
            })()

            const buyAmountAfterFeesCryptoBaseUnit = convertPrecision({
              value: expectedAmountOutThorBaseUnit,
              inputExponent: THORCHAIN_FIXED_PRECISION,
              outputExponent: buyAsset.precision,
            }).toFixed()

            return {
              id: uuid(),
              quoteOrRate: 'rate',
              memo,
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
              swapperName: SwapperName.Thorchain,
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
                  // TODO(gomes): when we actually split between TradeQuote and TradeRate in https://github.com/shapeshift/web/issues/7941,
                  // this won't be an issue anymore - for now this is tackled at runtime with the isConnected check above
                  accountNumber: accountNumber!,
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
      const cosmosChainAdapter = deps.assertGetCosmosSdkChainAdapter(sellAsset.chainId)
      const feeData = await cosmosChainAdapter.getFeeData({})

      return Ok(
        perRouteValues.map(
          ({
            source,
            quote,
            expectedAmountOutThorBaseUnit,
            isStreaming,
            estimatedExecutionTimeMs,
            affiliateBps,
          }): ThorTradeUtxoOrCosmosRate => {
            const rate = getRouteRate(expectedAmountOutThorBaseUnit)
            const buyAmountBeforeFeesCryptoBaseUnit =
              getRouteBuyAmountBeforeFeesCryptoBaseUnit(quote)

            const buyAmountAfterFeesCryptoBaseUnit = convertPrecision({
              value: expectedAmountOutThorBaseUnit,
              inputExponent: THORCHAIN_FIXED_PRECISION,
              outputExponent: buyAsset.precision,
            }).toFixed()

            // No memo returned for rates
            const memo = ''

            return {
              id: uuid(),
              quoteOrRate: 'rate',
              memo,
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
              swapperName: SwapperName.Thorchain,
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
      return assertUnreachable(chainNamespace)
  }
}
