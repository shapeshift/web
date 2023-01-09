import { SwapError, SwapErrorType, TradeResult, TradeTxs } from '../../../api'
import { CowSwapperDeps } from '../CowSwapper'
import { CowSwapGetOrdersResponse, CowSwapGetTradesResponse } from '../types'
import { ORDER_STATUS_FULFILLED } from '../utils/constants'
import { cowService } from '../utils/cowService'

export async function cowGetTradeTxs(deps: CowSwapperDeps, input: TradeResult): Promise<TradeTxs> {
  try {
    const getOrdersResponse = await cowService.get<CowSwapGetOrdersResponse>(
      `${deps.apiUrl}/v1/orders/${input.tradeId}`,
    )

    const {
      data: { status },
    } = getOrdersResponse

    if (status !== ORDER_STATUS_FULFILLED) {
      return {
        sellTxid: '',
      }
    }

    const getTradesResponse = await cowService.get<CowSwapGetTradesResponse>(
      `${deps.apiUrl}/v1/trades/?orderUid=${input.tradeId}`,
    )

    return {
      sellTxid: input.tradeId,
      buyTxid: getTradesResponse.data[0].txHash,
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[cowGetTradeTxs]', {
      cause: e,
      code: SwapErrorType.GET_TRADE_TXS_FAILED,
    })
  }
}
