import { btcAssetId, btcChainId, solanaChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import {
  bn,
  bnOrZero,
  chainIdToFeeAssetId,
  convertDecimalPercentageToBasisPoints,
  toBaseUnit,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { GetTradeRateInput, SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import {
  createTradeAmountTooSmallErr,
  getInputOutputRate,
  makeSwapErrorRight,
} from '../../../utils'
import { makeButterSwapAffiliate } from '../utils/constants'
import {
  ButterSwapErrorCode,
  butterSwapErrorToTradeQuoteError,
  getButterRoute,
  isRouteSuccess,
} from '../xhr'

export const getTradeRate = async (
  input: GetTradeRateInput,
  _deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    affiliateBps,
    accountNumber,
    receiveAddress,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  if (
    !isEvmChainId(sellAsset.chainId) &&
    sellAsset.chainId !== btcChainId &&
    sellAsset.chainId !== solanaChainId
  ) {
    return Err(
      makeSwapErrorRight({
        message: `Unsupported chain`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  // Yes, this is supposed to be supported as per checks above, but currently, Butter doesn't yield any quotes for BTC sells
  if (sellAsset.assetId === btcAssetId) {
    return Err(
      makeSwapErrorRight({
        message: `BTC sells are currently unsupported`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  // Disable same-chain swaps for ButterSwap, as we cannot collect affiliate fees for them
  if (sellAsset.chainId === buyAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        message: `Same-chain swaps are not supported by ButterSwap`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  const amount = bn(sellAmountIncludingProtocolFeesCryptoBaseUnit)
    .shiftedBy(-sellAsset.precision)
    .toString()

  const feeAssetId = chainIdToFeeAssetId(sellAsset.chainId)

  const slippageTolerancePercentageDecimal = getDefaultSlippageDecimalPercentageForSwapper(
    SwapperName.ButterSwap,
  )
  const slippage = convertDecimalPercentageToBasisPoints(
    slippageTolerancePercentageDecimal,
  ).toString()

  const result = await getButterRoute({
    sellAsset,
    buyAsset,
    sellAmountCryptoBaseUnit: amount,
    slippage,
    affiliate: makeButterSwapAffiliate(affiliateBps),
  })
  if (result.isErr()) {
    return Err(result.unwrapErr())
  }
  const routeResponse = result.unwrap()

  if (!isRouteSuccess(routeResponse)) {
    if (routeResponse.errno === ButterSwapErrorCode.InsufficientAmount) {
      const minAmountCryptoBaseUnit = toBaseUnit(
        (routeResponse as any).minAmount,
        sellAsset.precision,
      )
      return Err(
        createTradeAmountTooSmallErr({
          minAmountCryptoBaseUnit,
          assetId: sellAsset.assetId,
        }),
      )
    }
    return Err(
      makeSwapErrorRight({
        message: `[getTradeRate] ${routeResponse.message}`,
        code: butterSwapErrorToTradeQuoteError(routeResponse.errno),
      }),
    )
  }

  const route = routeResponse.data[0]
  if (!route) {
    return Err(
      makeSwapErrorRight({
        message: '[getTradeRate] No route found',
        code: TradeQuoteError.NoRouteFound,
      }),
    )
  }

  // Use destination receive amount as a priority if present and defined
  // It won't for same-chain swaps, so we fall back to the source chain receive amount (i.e source chain *is* the destination chain)
  const outputAmount = route.dstChain?.totalAmountOut ?? route.srcChain.totalAmountOut

  // TODO: affiliate fees not yet here, gut feel is that Butter won't do the swap output - fees logic for us here
  // Sanity check me when affiliates are implemented, and do the math ourselves if needed
  const buyAmountAfterFeesCryptoBaseUnit = toBaseUnit(outputAmount, buyAsset.precision)

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })

  const feeAsset = _deps.assetsById[feeAssetId]
  if (!feeAsset) {
    return Err(
      makeSwapErrorRight({
        message: `[getTradeRate] Fee asset not found for chainId ${sellAsset.chainId}`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  // Map gasFee.amount to networkFeeCryptoBaseUnit using fee asset precision
  const networkFeeCryptoBaseUnit = bnOrZero(route.gasFee?.amount).gt(0)
    ? toBaseUnit(route.gasFee.amount, feeAsset.precision)
    : '0'

  // Always a single step
  const step = {
    rate,
    buyAmountBeforeFeesCryptoBaseUnit: toBaseUnit(outputAmount, buyAsset.precision),
    buyAmountAfterFeesCryptoBaseUnit,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    feeData: {
      networkFeeCryptoBaseUnit,
      protocolFees: undefined,
    },
    source: SwapperName.ButterSwap,
    buyAsset,
    sellAsset,
    accountNumber,
    allowanceContract: route.contract ?? '0x0',
    estimatedExecutionTimeMs: route.timeEstimated * 1000,
  }

  const tradeRate: TradeRate = {
    id: route.hash,
    rate,
    swapperName: SwapperName.ButterSwap,
    receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
    quoteOrRate: 'rate',
    steps: [step],
  }

  return Ok([tradeRate])
}
