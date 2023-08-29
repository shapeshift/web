import type { AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import { getDefaultSlippagePercentageForSwapper } from 'constants/constants'
import { v4 as uuid } from 'uuid'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { baseUnitToPrecision, bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { getThorTxInfo as getEvmThorTxInfo } from 'lib/swapper/swappers/ThorchainSwapper/evm/utils/getThorTxData'
import { THORCHAIN_FIXED_PRECISION } from 'lib/swapper/swappers/ThorchainSwapper/utils/constants'
import { getQuote } from 'lib/swapper/swappers/ThorchainSwapper/utils/getQuote/getQuote'
import { getUtxoTxFees } from 'lib/swapper/swappers/ThorchainSwapper/utils/txFeeHelpers/utxoTxFees/getUtxoTxFees'
import { getThorTxInfo as getUtxoThorTxInfo } from 'lib/swapper/swappers/ThorchainSwapper/utxo/utils/getThorTxData'
import type {
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUtxoTradeQuoteInput,
  ProtocolFee,
  SwapErrorRight,
  TradeQuote,
} from 'lib/swapper/types'
import { SwapErrorType, SwapperName } from 'lib/swapper/types'
import { createTradeAmountTooSmallErr, makeSwapErrorRight } from 'lib/swapper/utils'
import { assertUnreachable, isFulfilled, isRejected } from 'lib/utils'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'
import { assertGetUtxoChainAdapter } from 'lib/utils/utxo'
import {
  convertBasisPointsToDecimalPercentage,
  convertDecimalPercentageToBasisPoints,
} from 'state/slices/tradeQuoteSlice/utils'

import { THORCHAIN_STREAM_SWAP_SOURCE } from '../constants'
import { addSlippageToMemo } from '../utils/addSlippageToMemo'
import { getEvmTxFees } from '../utils/txFeeHelpers/evmTxFees/getEvmTxFees'

export type ThorEvmTradeQuote = TradeQuote & {
  router: string
  data: string
}

type ThorTradeQuoteSpecificMetadata = { isStreaming: boolean; memo: string }
type ThorTradeQuoteBase = TradeQuote | ThorEvmTradeQuote
export type ThorTradeQuote = ThorTradeQuoteBase & ThorTradeQuoteSpecificMetadata

export const getThorTradeQuote = async (
  input: GetTradeQuoteInput,
): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    accountNumber,
    chainId,
    receiveAddress,
    affiliateBps,
    slippageTolerancePercentage,
  } = input

  const { chainNamespace } = fromAssetId(sellAsset.assetId)

  const { chainId: buyAssetChainId } = fromAssetId(buyAsset.assetId)
  const inputSlippageBps = convertDecimalPercentageToBasisPoints(
    slippageTolerancePercentage ?? getDefaultSlippagePercentageForSwapper(SwapperName.Thorchain),
  ).toString()

  const chainAdapterManager = getChainAdapterManager()
  const sellAdapter = chainAdapterManager.get(chainId)
  const buyAdapter = chainAdapterManager.get(buyAssetChainId)

  if (!sellAdapter || !buyAdapter) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - No chain adapter found for ${chainId} or ${buyAssetChainId}.`,
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: { sellAssetChainId: chainId, buyAssetChainId },
      }),
    )
  }

  if (!receiveAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[getThorTradeQuote]: receiveAddress is required',
        code: SwapErrorType.MISSING_INPUT,
      }),
    )
  }

  const maybeQuote = await getQuote({
    sellAsset,
    buyAssetId: buyAsset.assetId,
    sellAmountCryptoBaseUnit,
    receiveAddress,
    affiliateBps,
  })

  if (maybeQuote.isErr()) return Err(maybeQuote.unwrapErr())

  const thornodeQuote = maybeQuote.unwrap()
  const { fees } = thornodeQuote

  const recommendedMinAmountInCryptoBaseUnit = thornodeQuote.recommended_min_amount_in
    ? convertPrecision({
        value: thornodeQuote.recommended_min_amount_in,
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

  const thorSwapStreamingSwaps = getConfig().REACT_APP_FEATURE_THOR_SWAP_STREAMING_SWAPS

  const perRouteValues = [
    {
      // regular swap
      source: SwapperName.Thorchain,
      slippageBps: thornodeQuote.slippage_bps,
      expectedAmountOutThorBaseUnit: thornodeQuote.expected_amount_out,
      isStreaming: false,
      estimatedExecutionTimeMs:
        1000 *
        (thornodeQuote.inbound_confirmation_seconds ?? 0 + thornodeQuote.outbound_delay_seconds),
    },
    ...(thorSwapStreamingSwaps &&
    thornodeQuote.expected_amount_out !== thornodeQuote.expected_amount_out_streaming
      ? [
          {
            // streaming swap
            source: THORCHAIN_STREAM_SWAP_SOURCE,
            slippageBps: thornodeQuote.streaming_slippage_bps,
            expectedAmountOutThorBaseUnit: thornodeQuote.expected_amount_out_streaming,
            isStreaming: true,
            estimatedExecutionTimeMs: thornodeQuote.total_swap_seconds
              ? 1000 * thornodeQuote.total_swap_seconds
              : undefined,
          },
        ]
      : []),
  ]

  const getRouteRate = (expectedAmountOutThorBaseUnit: string) => {
    const THOR_PRECISION = 8
    const sellAmountCryptoPrecision = baseUnitToPrecision({
      value: sellAmountCryptoBaseUnit,
      inputExponent: sellAsset.precision,
    })
    // All thorchain pool amounts are base 8 regardless of token precision
    const sellAmountCryptoThorBaseUnit = bn(toBaseUnit(sellAmountCryptoPrecision, THOR_PRECISION))

    return bnOrZero(expectedAmountOutThorBaseUnit).div(sellAmountCryptoThorBaseUnit).toFixed()
  }

  const getRouteBuyAmount = (expectedAmountOutThorBaseUnit: string) => {
    // Because the expected_amount_out is the amount after fees, we need to add them back on to get the "before fees" amount
    // Add back the outbound fees
    const expectedAmountPlusFeesCryptoThorBaseUnit = bn(expectedAmountOutThorBaseUnit)
      .plus(fees.outbound)
      .plus(fees.affiliate)

    return toBaseUnit(
      fromBaseUnit(expectedAmountPlusFeesCryptoThorBaseUnit, THORCHAIN_FIXED_PRECISION),
      buyAsset.precision,
    )
  }

  const protocolFees = (() => {
    const buyAssetTradeFeeBuyAssetCryptoThorPrecision = bnOrZero(fees.outbound)

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
  })()

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
            slippageBps,
            expectedAmountOutThorBaseUnit,
            isStreaming,
            estimatedExecutionTimeMs,
          }) => {
            const rate = getRouteRate(expectedAmountOutThorBaseUnit)
            const buyAmountBeforeFeesCryptoBaseUnit = getRouteBuyAmount(
              expectedAmountOutThorBaseUnit,
            )

            const updatedMemo = addSlippageToMemo(
              thornodeQuote,
              inputSlippageBps,
              isStreaming,
              sellAsset.chainId,
            )
            const { data, router } = await getEvmThorTxInfo({
              sellAsset,
              sellAmountCryptoBaseUnit,
              memo: updatedMemo,
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
              isStreaming,
              estimatedExecutionTimeMs,
              recommendedSlippage: convertBasisPointsToDecimalPercentage(slippageBps).toString(),
              rate,
              data,
              router,
              steps: [
                {
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
                    protocolFees,
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
            slippageBps,
            expectedAmountOutThorBaseUnit,
            isStreaming,
            estimatedExecutionTimeMs,
          }) => {
            const rate = getRouteRate(expectedAmountOutThorBaseUnit)
            const buyAmountBeforeFeesCryptoBaseUnit = getRouteBuyAmount(
              expectedAmountOutThorBaseUnit,
            )

            const updatedMemo = addSlippageToMemo(
              thornodeQuote,
              inputSlippageBps,
              isStreaming,
              sellAsset.chainId,
            )
            const maybeThorTxInfo = await getUtxoThorTxInfo({
              sellAsset,
              xpub: (input as GetUtxoTradeQuoteInput).xpub,
              memo: updatedMemo,
            })
            if (maybeThorTxInfo.isErr()) throw maybeThorTxInfo.unwrapErr()
            const thorTxInfo = maybeThorTxInfo.unwrap()
            const { vault, opReturnData, pubkey } = thorTxInfo

            const sellAdapter = assertGetUtxoChainAdapter(sellAsset.chainId)
            const feeData = await getUtxoTxFees({
              sellAmountCryptoBaseUnit,
              vault,
              opReturnData,
              pubkey,
              sellAdapter,
              protocolFees,
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
              isStreaming,
              estimatedExecutionTimeMs,
              recommendedSlippage: convertBasisPointsToDecimalPercentage(slippageBps).toString(),
              rate,
              steps: [
                {
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
            slippageBps,
            expectedAmountOutThorBaseUnit,
            isStreaming,
            estimatedExecutionTimeMs,
          }) => {
            const rate = getRouteRate(expectedAmountOutThorBaseUnit)
            const buyAmountBeforeFeesCryptoBaseUnit = getRouteBuyAmount(
              expectedAmountOutThorBaseUnit,
            )

            const buyAmountAfterFeesCryptoBaseUnit = convertPrecision({
              value: expectedAmountOutThorBaseUnit,
              inputExponent: THORCHAIN_FIXED_PRECISION,
              outputExponent: buyAsset.precision,
            }).toFixed()

            const updatedMemo = addSlippageToMemo(
              thornodeQuote,
              inputSlippageBps,
              isStreaming,
              sellAsset.chainId,
            )

            return {
              id: uuid(),
              memo: updatedMemo,
              receiveAddress,
              affiliateBps,
              isStreaming,
              estimatedExecutionTimeMs,
              recommendedSlippage: convertBasisPointsToDecimalPercentage(slippageBps).toString(),
              rate,
              steps: [
                {
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
                    protocolFees,
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
