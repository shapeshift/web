import type { Swapper } from '../../types'
import { executeEvmTransaction } from '../../utils'

export const LIFI_TRADE_POLL_INTERVAL_MILLISECONDS = 30_000
export const LIFI_GET_TRADE_QUOTE_POLLING_INTERVAL = 60_000

export const lifiSwapper: Swapper = {
  executeEvmTransaction,
}
