import type { Swapper } from '../../types'
import { executeEvmTransaction, executeSolanaTransaction } from '../../utils'

export const bebopSwapper: Swapper = {
  executeEvmTransaction,
  executeSolanaTransaction,
}
