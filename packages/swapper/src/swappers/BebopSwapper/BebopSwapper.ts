import type { Swapper } from '../../types'
import { executeEvmTransaction } from '../../utils'

export const bebopSwapper: Swapper = {
  executeEvmTransaction,
}
