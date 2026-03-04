import type { Swapper } from '../../types'
import { executeEvmTransaction, executeSolanaTransaction } from '../../utils'

export const acrossSwapper: Swapper = {
  executeEvmTransaction,
  executeSolanaTransaction,
}
