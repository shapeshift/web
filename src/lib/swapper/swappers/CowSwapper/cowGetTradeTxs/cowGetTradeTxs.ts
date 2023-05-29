import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { SwapErrorRight, TradeResult, TradeTxs } from 'lib/swapper/api'
import type { CowSwapperDeps } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import type {
  CowSwapGetOrdersResponse,
  CowSwapGetTradesResponse,
} from 'lib/swapper/swappers/CowSwapper/types'
import { ORDER_STATUS_FULFILLED } from 'lib/swapper/swappers/CowSwapper/utils/constants'
import { cowService } from 'lib/swapper/swappers/CowSwapper/utils/cowService'

import { getCowswapNetwork } from '../utils/helpers/helpers'

export async function cowGetTradeTxs(
  deps: CowSwapperDeps,
  input: TradeResult,
): Promise<Result<TradeTxs, SwapErrorRight>> {
  const network = getCowswapNetwork(deps.adapter)
  const maybeGetOrdersResponse = await cowService.get<CowSwapGetOrdersResponse>(
    `${deps.baseUrl}/${network}/api/v1/orders/${input.tradeId}`,
  )

  if (maybeGetOrdersResponse.isErr()) return Err(maybeGetOrdersResponse.unwrapErr())

  const {
    data: { status },
  } = maybeGetOrdersResponse.unwrap()

  if (status !== ORDER_STATUS_FULFILLED) {
    return Ok({
      sellTxid: '',
    })
  }

  const maybeGetTradesResponse = await cowService.get<CowSwapGetTradesResponse>(
    `${deps.baseUrl}/${network}/api/v1/trades/?orderUid=${input.tradeId}`,
  )

  return maybeGetTradesResponse.andThen(getTradesResponse =>
    Ok({
      sellTxid: input.tradeId,
      buyTxid: getTradesResponse.data[0].txHash,
    }),
  )
}
