import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { SwapErrorRight, TradeResult, TradeTxs } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from 'lib/swapper/api'
import type { CowSwapperDeps } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import type {
  CowSwapGetOrdersResponse,
  CowSwapGetTradesResponse,
} from 'lib/swapper/swappers/CowSwapper/types'
import { ORDER_STATUS_FULFILLED } from 'lib/swapper/swappers/CowSwapper/utils/constants'
import { cowService } from 'lib/swapper/swappers/CowSwapper/utils/cowService'

export async function cowGetTradeTxs(
  deps: CowSwapperDeps,
  input: TradeResult,
): Promise<Result<TradeTxs, SwapErrorRight>> {
  try {
    const getOrdersResponse = await cowService.get<CowSwapGetOrdersResponse>(
      `${deps.apiUrl}/v1/orders/${input.tradeId}`,
    )

    const {
      data: { status },
    } = getOrdersResponse

    if (status !== ORDER_STATUS_FULFILLED) {
      return Ok({
        sellTxid: '',
      })
    }

    const getTradesResponse = await cowService.get<CowSwapGetTradesResponse>(
      `${deps.apiUrl}/v1/trades/?orderUid=${input.tradeId}`,
    )

    return Ok({
      sellTxid: input.tradeId,
      buyTxid: getTradesResponse.data[0].txHash,
    })
  } catch (e) {
    if (e instanceof SwapError)
      return Err(
        makeSwapErrorRight({
          message: e.message,
          code: e.code,
          details: e.details,
        }),
      )
    return Err(
      makeSwapErrorRight({
        message: '[cowGetTradeTxs]',
        cause: e,
        code: SwapErrorType.GET_TRADE_TXS_FAILED,
      }),
    )
  }
}
