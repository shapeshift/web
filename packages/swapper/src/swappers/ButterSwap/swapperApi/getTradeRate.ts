import { bn, bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import type { GetTradeRateInput, SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { chainIdToButterSwapChainId } from '../utils/helpers'
import { getRoute, isRouteSuccess } from '../xhr'

export const getTradeRate = async (
  input: GetTradeRateInput,
  _deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const { sellAsset, buyAsset, affiliateBps } = input

  const fromChainId = chainIdToButterSwapChainId(sellAsset.chainId)
  const toChainId = chainIdToButterSwapChainId(buyAsset.chainId)

  if (!fromChainId || !toChainId) {
    return Err(
      makeSwapErrorRight({
        message: '[getTradeRate] Unsupported chainId',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  // Use one full unit of the sell asset to get a rate
  const amount = bn(1).shiftedBy(sellAsset.precision).toString()

  const result = await getRoute(fromChainId, sellAsset.assetId, toChainId, buyAsset.assetId, amount)

  if (result.isErr()) return Err(result.unwrapErr())
  const routeResponse = result.unwrap()

  if (!isRouteSuccess(routeResponse)) {
    return Err(
      makeSwapErrorRight({
        message: `[getTradeRate] ${routeResponse.message}`,
        code: TradeQuoteError.QueryFailed,
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

  const rate = bnOrZero(route.srcChain.totalAmountOut).shiftedBy(-buyAsset.precision).toString()

  const tradeRate: TradeRate = {
    id: uuid(),
    rate,
    swapperName: SwapperName.ButterSwap,
    receiveAddress: undefined,
    affiliateBps: affiliateBps ?? '0',
    slippageTolerancePercentageDecimal: undefined,
    quoteOrRate: 'rate',
    steps: [
      {
        rate,
        buyAmountBeforeFeesCryptoBaseUnit: '0', // Not available from this endpoint
        buyAmountAfterFeesCryptoBaseUnit: '0', // Not available from this endpoint
        sellAmountIncludingProtocolFeesCryptoBaseUnit: amount,
        feeData: {
          networkFeeCryptoBaseUnit: undefined,
          protocolFees: {},
        },
        source: SwapperName.ButterSwap,
        buyAsset,
        sellAsset,
        accountNumber: undefined,
        allowanceContract: '0x0',
        estimatedExecutionTimeMs: route.timeEstimated,
      },
    ],
  }

  return Ok([tradeRate])
}
