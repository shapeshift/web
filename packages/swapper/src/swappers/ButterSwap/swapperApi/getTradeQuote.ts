import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { CommonTradeQuoteInput, SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { chainIdToButterSwapChainId } from '../utils/helpers'
import { getRoute, isRouteSuccess } from '../xhr'

export const getTradeQuote = async (
  input: CommonTradeQuoteInput,
  _deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: amount,
    receiveAddress,
    slippageTolerancePercentageDecimal,
  } = input

  // Map ShapeShift chain IDs to ButterSwap numeric chain IDs
  const fromChainId = chainIdToButterSwapChainId(sellAsset.chainId)
  const toChainId = chainIdToButterSwapChainId(buyAsset.chainId)
  if (!fromChainId || !toChainId) {
    return Err(
      makeSwapErrorRight({
        message: '[getTradeQuote] Unsupported chainId',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  // Call ButterSwap API via service
  const result = await getRoute(fromChainId, sellAsset.assetId, toChainId, buyAsset.assetId, amount)

  if (result.isErr()) return Err(result.unwrapErr())
  const routeResponse = result.unwrap()
  if (!isRouteSuccess(routeResponse)) {
    return Err(
      makeSwapErrorRight({
        message: `[getTradeQuote] ${routeResponse.message}`,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }

  // Map ButterSwap route to TradeQuote
  const route = routeResponse.data[0]
  if (!route) {
    return Err(
      makeSwapErrorRight({
        message: '[getTradeQuote] No route found',
        code: TradeQuoteError.NoRouteFound,
      }),
    )
  }

  // TODO: Map all required fields from route to TradeQuote
  const tradeQuote: TradeQuote = {
    id: route.hash,
    rate: route.srcChain.totalAmountOut, // Example mapping, adjust as needed
    receiveAddress,
    affiliateBps: '0',
    isStreaming: false,
    quoteOrRate: 'quote',
    swapperName: SwapperName.ButterSwap,
    slippageTolerancePercentageDecimal,
    steps: [
      {
        buyAmountBeforeFeesCryptoBaseUnit: '0', // TODO: Map actual value
        buyAmountAfterFeesCryptoBaseUnit: '0', // TODO: Map actual value
        sellAmountIncludingProtocolFeesCryptoBaseUnit: amount,
        feeData: {
          networkFeeCryptoBaseUnit: '0', // TODO: Map actual value
          protocolFees: {},
        },
        rate: route.srcChain.totalAmountOut, // Example mapping
        source: SwapperName.ButterSwap,
        buyAsset,
        sellAsset,
        accountNumber: 0, // TODO: Map actual value if available
        allowanceContract: '0x0',
        estimatedExecutionTimeMs: route.timeEstimated,
      },
    ],
  }

  return Ok([tradeQuote])
}
