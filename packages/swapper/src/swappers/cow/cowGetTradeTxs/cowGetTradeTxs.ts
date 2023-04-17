import type { Result } from '@sniptt/monads'
import { Ok } from '@sniptt/monads'

import type { SwapErrorMonad, TradeResult, TradeTxs } from '../../../api'
import { SwapError, SwapErrorType } from '../../../api'
import type { CowSwapperDeps } from '../CowSwapper'
import type { CowSwapGetOrdersResponse, CowSwapGetTradesResponse } from '../types'
import { ORDER_STATUS_FULFILLED } from '../utils/constants'
import { cowService } from '../utils/cowService'

export async function cowGetTradeTxs(
  deps: CowSwapperDeps,
  input: TradeResult,
): Promise<Result<TradeTxs, SwapErrorMonad>> {
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
    // TODO(gomes): don't throw in this module
    if (e instanceof SwapError) throw e
    throw new SwapError('[cowGetTradeTxs]', {
      cause: e,
      code: SwapErrorType.GET_TRADE_TXS_FAILED,
    })
  }
}
