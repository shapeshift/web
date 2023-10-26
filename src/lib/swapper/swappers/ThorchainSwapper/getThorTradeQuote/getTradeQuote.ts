import type { AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import { v4 as uuid } from 'uuid'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { baseUnitToPrecision, bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { getThorTxInfo as getEvmThorTxInfo } from 'lib/swapper/swappers/ThorchainSwapper/evm/utils/getThorTxData'
import { THORCHAIN_FIXED_PRECISION } from 'lib/swapper/swappers/ThorchainSwapper/utils/constants'
import { getQuote } from 'lib/swapper/swappers/ThorchainSwapper/utils/getQuote/getQuote'
import { assertIsValidMemo } from 'lib/swapper/swappers/ThorchainSwapper/utils/makeSwapMemo/assertIsValidMemo'
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
import { subtractBasisPointAmount } from 'state/slices/tradeQuoteSlice/utils'

import { THORCHAIN_STREAM_SWAP_SOURCE } from '../constants'
import type { ThornodePoolResponse, ThornodeQuoteResponseSuccess } from '../types'
import { assetIdToPoolAssetId } from '../utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from '../utils/thorService'
import { getEvmTxFees } from '../utils/txFeeHelpers/evmTxFees/getEvmTxFees'

export type ThorEvmTradeQuote = TradeQuote &
  ThorTradeQuoteSpecificMetadata & {
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
    affiliateBps: requestedAffiliateBps,
  } = input

  const { chainNamespace } = fromAssetId(sellAsset.assetId)
  const { chainId: buyAssetChainId } = fromAssetId(buyAsset.assetId)

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

  const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
  const maybePoolsResponse = await thorService.get<ThornodePoolResponse[]>(
    `${daemonUrl}/lcd/thorchain/pools`,
  )

  if (maybePoolsResponse.isErr()) return Err(maybePoolsResponse.unwrapErr())

  const { data: poolsResponse } = maybePoolsResponse.unwrap()

  const buyPoolId = assetIdToPoolAssetId({ assetId: buyAsset.assetId })
  const sellPoolId = assetIdToPoolAssetId({ assetId: sellAsset.assetId })

  const sellAssetPool = poolsResponse.find(pool => pool.asset === sellPoolId)
  const buyAssetPool = poolsResponse.find(pool => pool.asset === buyPoolId)

  if (!sellAssetPool && sellPoolId !== 'THOR.RUNE')
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote]: Pool not found for sell asset ${sellAsset.assetId}`,
        code: SwapErrorType.POOL_NOT_FOUND,
        details: { sellAssetId: sellAsset.assetId, buyAssetId: buyAsset.assetId },
      }),
    )

  if (!buyAssetPool && buyPoolId !== 'THOR.RUNE')
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote]: Pool not found for buy asset ${buyAsset.assetId}`,
        code: SwapErrorType.POOL_NOT_FOUND,
        details: { sellAssetId: sellAsset.assetId, buyAsset: buyAsset.assetId },
      }),
    )

  const streamingInterval =
    sellAssetPool && buyAssetPool
      ? (() => {
          const sellAssetDepthBps = sellAssetPool.derived_depth_bps
          const buyAssetDepthBps = buyAssetPool.derived_depth_bps

          // We are trading between 2 L1s, use a streaming interval of 1 block
          if (bnOrZero(sellAssetDepthBps).eq(0) && bnOrZero(buyAssetDepthBps).eq(0)) return 1

          // We are trading between 2 derived pools, use the average of the 2 depths to determine the streaming interval
          if (bnOrZero(sellAssetDepthBps).gt(0) && bnOrZero(buyAssetDepthBps).gt(0)) {
            const swapDepthBps = bn(sellAssetDepthBps).plus(buyAssetDepthBps).div(2)
            // Low health for the pools of this swap - use a longer streaming interval
            if (swapDepthBps.lt(5000)) return 5
            // Moderate health for the pools of this swap - use a moderate streaming interval
            if (swapDepthBps.lt(9000) && swapDepthBps.gte(5000)) return 3
            return 1
          }

          // The sell asset is a derived pool, the buy asset is an L1 pool - use the sell asset depth to determine the streaming interval
          if (bnOrZero(sellAssetDepthBps).gt(0)) {
            if (bn(sellAssetDepthBps).lt(5000)) return 5
            // Moderate health for the pools of this swap - use a moderate streaming interval
            if (bn(sellAssetDepthBps).lt(9000) && bn(sellAssetDepthBps).gte(5000)) return 3
            return 1
          }

          // The buy asset is a derived pool, the seLl asset is an L1 pool - use the buy asset depth to determine the streaming interval
          if (bnOrZero(buyAssetDepthBps).gt(0)) {
            if (bn(buyAssetDepthBps).lt(5000)) return 5
            // Moderate health for the pools of this swap - use a moderate streaming interval
            if (bn(buyAssetDepthBps).lt(9000) && bn(buyAssetDepthBps).gte(5000)) return 3
            return 1
          }

          // If we get here, we've missed a case
          throw new Error('Unable to determine streaming interval')
        })()
      : // TODO: One of the pools is RUNE - use the as-is 10 until we work out how best to handle this
        10

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
    const THOR_PRECISION = 8
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
          }): Promise<ThorTradeQuote> => {
            const rate = getRouteRate(expectedAmountOutThorBaseUnit)
            const buyAmountBeforeFeesCryptoBaseUnit = getRouteBuyAmount(quote)
            const memo = quote.memo
            if (!memo) throw new Error('No memo in quote')
            assertIsValidMemo(memo, sellAsset.chainId, affiliateBps)

            const { data, router } = await getEvmThorTxInfo({
              sellAsset,
              sellAmountCryptoBaseUnit,
              memo,
              expiry: quote.expiry,
            })

            const buyAmountAfterFeesCryptoBaseUnit = convertPrecision({
              value: expectedAmountOutThorBaseUnit,
              inputExponent: THORCHAIN_FIXED_PRECISION,
              outputExponent: buyAsset.precision,
            }).toFixed()

            return {
              id: uuid(),
              memo,
              receiveAddress,
              affiliateBps,
              isStreaming,
              estimatedExecutionTimeMs,
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
          }): Promise<ThorTradeQuote> => {
            const memo = quote.memo
            if (!memo) throw new Error('No memo in quote')
            assertIsValidMemo(memo, sellAsset.chainId, affiliateBps)
            const rate = getRouteRate(expectedAmountOutThorBaseUnit)
            const buyAmountBeforeFeesCryptoBaseUnit = getRouteBuyAmount(quote)

            const { vault, opReturnData, pubkey } = await getUtxoThorTxInfo({
              sellAsset,
              xpub: (input as GetUtxoTradeQuoteInput).xpub,
              memo,
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
              memo,
              receiveAddress,
              affiliateBps,
              isStreaming,
              estimatedExecutionTimeMs,
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
            quote,
            expectedAmountOutThorBaseUnit,
            isStreaming,
            estimatedExecutionTimeMs,
            affiliateBps,
          }): ThorTradeQuote => {
            const memo = quote.memo
            if (!memo) throw new Error('No memo in quote')
            assertIsValidMemo(memo, sellAsset.chainId, affiliateBps)
            const rate = getRouteRate(expectedAmountOutThorBaseUnit)
            const buyAmountBeforeFeesCryptoBaseUnit = getRouteBuyAmount(quote)

            const buyAmountAfterFeesCryptoBaseUnit = convertPrecision({
              value: expectedAmountOutThorBaseUnit,
              inputExponent: THORCHAIN_FIXED_PRECISION,
              outputExponent: buyAsset.precision,
            }).toFixed()

            return {
              id: uuid(),
              memo,
              receiveAddress,
              affiliateBps,
              isStreaming,
              estimatedExecutionTimeMs,
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
