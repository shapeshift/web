import type { Swapper } from '../../types'
import { executeEvmTransaction, executeTronTransaction } from '../../utils'

export const symbiosisSwapper: Swapper = {
  executeEvmTransaction,
  executeTronTransaction,
}
