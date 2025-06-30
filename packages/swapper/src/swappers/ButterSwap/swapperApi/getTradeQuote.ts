import { fromAssetId, solanaChainId } from '@shapeshiftoss/caip'
import { bn, bnOrZero, chainIdToFeeAssetId, fromBaseUnit, toBaseUnit } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { zeroAddress } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { CommonTradeQuoteInput, SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { makeButterSwapAffiliate } from '../utils/constants'
import {
  butterSwapErrorToTradeQuoteError,
  getBuildTx,
  getButterRoute,
  isBuildTxSuccess,
  isRouteSuccess,
} from '../xhr'

const SOLANA_NATIVE_ADDRESS = 'So11111111111111111111111111111111111111112'

export const getButterQuote = async (
  input: CommonTradeQuoteInput,
  _deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: amount,
    receiveAddress,
    sendAddress,
    slippageTolerancePercentageDecimal,
    accountNumber,
    affiliateBps,
  } = input

  if (!sendAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[getTradeQuote] sendAddress is required for ButterSwap',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const feeAssetId = chainIdToFeeAssetId(sellAsset.chainId)
  const sellAssetIsNative = sellAsset.assetId === feeAssetId
  const buyAssetIsNative = buyAsset.assetId === chainIdToFeeAssetId(buyAsset.chainId)

  const { assetReference: sellAssetAddressRaw } = fromAssetId(sellAsset.assetId)
  const { assetReference: buyAssetAddressRaw } = fromAssetId(buyAsset.assetId)

  const sellAssetAddress = (() => {
    if (sellAsset.chainId === solanaChainId && sellAssetIsNative) return SOLANA_NATIVE_ADDRESS
    if (sellAssetIsNative) return zeroAddress
    return sellAssetAddressRaw
  })()
  const buyAssetAddress = (() => {
    if (buyAsset.chainId === solanaChainId && buyAssetIsNative) return SOLANA_NATIVE_ADDRESS
    if (buyAssetIsNative) return zeroAddress
    return buyAssetAddressRaw
  })()
  const slippageDecimal =
    slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.ButterSwap)
  const slippage = bn(slippageDecimal).times(10000).toString()

  // Call ButterSwap /route API
  const routeResult = await getButterRoute({
    fromChainId: sellAsset.chainId,
    sellAssetAddress,
    toChainId: buyAsset.chainId,
    buyAssetAddress,
    amountHumanUnits: fromBaseUnit(amount, sellAsset.precision),
    slippage,
    affiliate: makeButterSwapAffiliate(affiliateBps),
  })

  if (routeResult.isErr()) return Err(routeResult.unwrapErr())
  const routeResponse = routeResult.unwrap()
  if (!isRouteSuccess(routeResponse)) {
    return Err(
      makeSwapErrorRight({
        message: `[getTradeQuote] ${routeResponse.message}`,
        code: butterSwapErrorToTradeQuoteError(routeResponse.errno),
      }),
    )
  }

  const route = routeResponse.data[0]
  if (!route) {
    return Err(
      makeSwapErrorRight({
        message: '[getTradeQuote] No route found',
        code: TradeQuoteError.NoRouteFound,
      }),
    )
  }

  // Call ButterSwap /swap API to get calldata and contract info
  const buildTxResult = await getBuildTx({
    hash: route.hash,
    slippage,
    from: sendAddress, // from (source chain address)
    receiver: receiveAddress, // receiver (destination chain address)
  })

  if (buildTxResult.isErr()) return Err(buildTxResult.unwrapErr())
  const buildTxResponse = buildTxResult.unwrap()
  if (!isBuildTxSuccess(buildTxResponse)) {
    return Err(
      makeSwapErrorRight({
        message: `[getTradeQuote] /swap failed: ${buildTxResponse.message}`,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
  const buildTx = buildTxResponse.data[0]
  if (!buildTx) {
    return Err(
      makeSwapErrorRight({
        message: '[getTradeQuote] No buildTx data returned',
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }

  // Fee asset for network/protocol fees
  const feeAsset = _deps.assetsById[feeAssetId]
  if (!feeAsset) {
    return Err(
      makeSwapErrorRight({
        message: `[getTradeQuote] Fee asset not found for chainId ${sellAsset.chainId}`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  // Map gasFee.amount to networkFeeCryptoBaseUnit using fee asset precision
  const networkFeeCryptoBaseUnit = toBaseUnit(bnOrZero(route.gasFee?.amount), feeAsset.precision)

  // Calculate rate as lastHop.totalAmountOut / srcChain.totalAmountIn (in base units)
  // For cross-chain swaps, use dstChain.totalAmountOut (final min amount out)
  // For same-chain swaps, use srcChain.totalAmountOut
  // We do NOT use bridgeChain.totalAmountOut, as it is only an intermediary for cross-chain swaps
  const inputAmount = bnOrZero(route.srcChain.totalAmountIn)
  const outputAmount = route.dstChain?.totalAmountOut ?? route.srcChain.totalAmountOut
  const rate = inputAmount.gt(0) ? bnOrZero(outputAmount).div(inputAmount).toString() : '0'

  const step = {
    buyAmountBeforeFeesCryptoBaseUnit: toBaseUnit(outputAmount, buyAsset.precision),
    buyAmountAfterFeesCryptoBaseUnit: toBaseUnit(outputAmount, buyAsset.precision),
    sellAmountIncludingProtocolFeesCryptoBaseUnit: amount,
    feeData: {
      networkFeeCryptoBaseUnit,
      protocolFees: undefined,
    },
    rate,
    source: SwapperName.ButterSwap,
    buyAsset,
    sellAsset,
    accountNumber,
    allowanceContract: route.contract ?? '0x0',
    estimatedExecutionTimeMs: route.timeEstimated * 1000,
    butterSwapTransactionMetadata: {
      to: buildTx.to,
      data: buildTx.data,
      value: buildTx.value,
    },
  }

  const tradeQuote: TradeQuote = {
    id: route.hash,
    rate,
    receiveAddress,
    affiliateBps,
    isStreaming: false,
    quoteOrRate: 'quote',
    swapperName: SwapperName.ButterSwap,
    slippageTolerancePercentageDecimal: slippageDecimal,
    steps: [step],
  }

  return Ok([tradeQuote])
}
