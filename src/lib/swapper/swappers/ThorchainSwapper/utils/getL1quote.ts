import type { AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { bn, bnOrZero } from '@shapeshiftoss/chain-adapters'
import { Err, Ok, type Result } from '@sniptt/monads'
import { getConfig } from 'config'
import { getDefaultSlippageDecimalPercentageForSwapper } from 'constants/constants'
import { v4 as uuid } from 'uuid'
import { baseUnitToPrecision, convertPrecision } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { getThorTxInfo as getEvmThorTxInfo } from 'lib/swapper/swappers/ThorchainSwapper/evm/utils/getThorTxData'
import { getThorTxInfo as getUtxoThorTxInfo } from 'lib/swapper/swappers/ThorchainSwapper/utxo/utils/getThorTxData'
import type { GetEvmTradeQuoteInput, GetUtxoTradeQuoteInput, ProtocolFee } from 'lib/swapper/types'
import {
  type GetTradeQuoteInput,
  type SwapErrorRight,
  SwapErrorType,
  SwapperName,
} from 'lib/swapper/types'
import { createTradeAmountTooSmallErr, makeSwapErrorRight } from 'lib/swapper/utils'
import { assertUnreachable, isFulfilled, isRejected } from 'lib/utils'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'
import { THOR_PRECISION } from 'lib/utils/thorchain/constants'
import { assertGetUtxoChainAdapter } from 'lib/utils/utxo'
import {
  convertDecimalPercentageToBasisPoints,
  subtractBasisPointAmount,
} from 'state/slices/tradeQuoteSlice/utils'

import { THORCHAIN_STREAM_SWAP_SOURCE } from '../constants'
import type { ThorTradeQuote } from '../getThorTradeQuote/getTradeQuote'
import type { ThornodeQuoteResponseSuccess } from '../types'
import { addSlippageToMemo } from './addSlippageToMemo'
import { THORCHAIN_FIXED_PRECISION } from './constants'
import { getQuote } from './getQuote/getQuote'
import { getEvmTxFees } from './txFeeHelpers/evmTxFees/getEvmTxFees'
import { getUtxoTxFees } from './txFeeHelpers/utxoTxFees/getUtxoTxFees'

export const getL1quote = async (
  input: GetTradeQuoteInput,
  streamingInterval: number,
): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    accountNumber,
    receiveAddress,
    affiliateBps: requestedAffiliateBps,
    potentialAffiliateBps,
    slippageTolerancePercentage,
  } = input

  const { chainNamespace } = fromAssetId(sellAsset.assetId)

  const inputSlippageBps = convertDecimalPercentageToBasisPoints(
    slippageTolerancePercentage ??
      getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Thorchain),
  ).toString()

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
  const recommendedMinAmountInCryptoBaseUnit = swapQuote.recommended_min_amount_in
    ? convertPrecision({
        value: swapQuote.recommended_min_amount_in,
        inputExponent: THORCHAIN_FIXED_PRECISION,
        outputExponent: sellAsset.precision,
      })
    : undefined

  if (
    recommendedMinAmountInCryptoBaseUnit &&
    bn(sellAmountCryptoBaseUnit).lt(recommendedMinAmountInCryptoBaseUnit)
  ) {
    return Err(
      createTradeAmountTooSmallErr({
        minAmountCryptoBaseUnit: recommendedMinAmountInCryptoBaseUnit.toFixed(),
        assetId: sellAsset.assetId,
      }),
    )
  }

  const getRouteValues = (quote: ThornodeQuoteResponseSuccess, isStreaming: boolean) => ({
    source: isStreaming ? THORCHAIN_STREAM_SWAP_SOURCE : SwapperName.Thorchain,
    quote,
    // expected receive amount after slippage (no affiliate_fee or liquidity_fee taken out of this value)
    // TODO: slippage is currently being applied on expected_amount_out which is emit_asset - outbound_fee,
    //       should slippage actually be applied on emit_asset?
    expectedAmountOutThorBaseUnit: subtractBasisPointAmount(
      quote.expected_amount_out,
      quote.fees.slippage_bps,
    ),
    isStreaming,
    affiliateBps: quote.fees.affiliate === '0' ? '0' : requestedAffiliateBps,
    potentialAffiliateBps,
    estimatedExecutionTimeMs: quote.total_swap_seconds
      ? 1000 * quote.total_swap_seconds
      : undefined,
  })

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

  const getRouteBuyAmount = (quote: ThornodeQuoteResponseSuccess) => {
    const emitAsset = bn(quote.expected_amount_out).plus(quote.fees.outbound)
    return toBaseUnit(fromBaseUnit(emitAsset, THORCHAIN_FIXED_PRECISION), buyAsset.precision)
  }

  const getProtocolFees = (quote: ThornodeQuoteResponseSuccess) => {
    const buyAssetTradeFeeBuyAssetCryptoThorPrecision = bnOrZero(quote.fees.outbound)

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
            potentialAffiliateBps,
          }): Promise<ThorTradeQuote> => {
            const rate = getRouteRate(expectedAmountOutThorBaseUnit)
            const buyAmountBeforeFeesCryptoBaseUnit = getRouteBuyAmount(quote)

            const updatedMemo = addSlippageToMemo({
              expectedAmountOutThorBaseUnit,
              affiliateFeesThorBaseUnit: quote.fees.affiliate,
              quotedMemo: quote.memo,
              slippageBps: inputSlippageBps,
              chainId: sellAsset.chainId,
              affiliateBps,
              isStreaming,
              streamingInterval,
            })
            const { data, router } = await getEvmThorTxInfo({
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
              rate,
              data,
              router,
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
            code: SwapErrorType.TRADE_QUOTE_FAILED,
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
            potentialAffiliateBps,
          }): Promise<ThorTradeQuote> => {
            const rate = getRouteRate(expectedAmountOutThorBaseUnit)
            const buyAmountBeforeFeesCryptoBaseUnit = getRouteBuyAmount(quote)

            const updatedMemo = addSlippageToMemo({
              expectedAmountOutThorBaseUnit,
              affiliateFeesThorBaseUnit: quote.fees.affiliate,
              quotedMemo: quote.memo,
              slippageBps: inputSlippageBps,
              isStreaming,
              chainId: sellAsset.chainId,
              affiliateBps,
              streamingInterval,
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
            code: SwapErrorType.TRADE_QUOTE_FAILED,
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
            potentialAffiliateBps,
          }): ThorTradeQuote => {
            const rate = getRouteRate(expectedAmountOutThorBaseUnit)
            const buyAmountBeforeFeesCryptoBaseUnit = getRouteBuyAmount(quote)

            const buyAmountAfterFeesCryptoBaseUnit = convertPrecision({
              value: expectedAmountOutThorBaseUnit,
              inputExponent: THORCHAIN_FIXED_PRECISION,
              outputExponent: buyAsset.precision,
            }).toFixed()

            const updatedMemo = addSlippageToMemo({
              expectedAmountOutThorBaseUnit,
              affiliateFeesThorBaseUnit: quote.fees.affiliate,
              quotedMemo: quote.memo,
              slippageBps: inputSlippageBps,
              isStreaming,
              chainId: sellAsset.chainId,
              affiliateBps,
              streamingInterval,
            })

            return {
              id: uuid(),
              memo: updatedMemo,
              receiveAddress,
              affiliateBps,
              potentialAffiliateBps,
              isStreaming,
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
