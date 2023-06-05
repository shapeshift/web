import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import type { SwapErrorRight, TradeTxs } from 'lib/swapper/api'
import type {
  CowSwapGetOrdersResponse,
  CowSwapGetTradesResponse,
  CowTradeResult,
} from 'lib/swapper/swappers/CowSwapper/types'
import { ORDER_STATUS_FULFILLED } from 'lib/swapper/swappers/CowSwapper/utils/constants'
import { cowService } from 'lib/swapper/swappers/CowSwapper/utils/cowService'

import { getCowswapNetwork } from '../utils/helpers/helpers'

export async function cowGetTradeTxs(
  input: CowTradeResult,
): Promise<Result<TradeTxs, SwapErrorRight>> {
  const maybeNetwork = getCowswapNetwork(input.chainId)
  if (maybeNetwork.isErr()) return Err(maybeNetwork.unwrapErr())
  const network = maybeNetwork.unwrap()

  const baseUrl = getConfig().REACT_APP_COWSWAP_BASE_URL

  const maybeGetOrdersResponse = await cowService.get<CowSwapGetOrdersResponse>(
    `${baseUrl}/${network}/api/v1/orders/${input.tradeId}`,
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
    `${baseUrl}/${network}/api/v1/trades/?orderUid=${input.tradeId}`,
  )

  return maybeGetTradesResponse.andThen(getTradesResponse =>
    Ok({
      sellTxid: input.tradeId,
      buyTxid: getTradesResponse.data[0].txHash,
    }),
  )
}
