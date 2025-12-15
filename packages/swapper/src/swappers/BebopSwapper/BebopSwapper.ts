import type { Swapper } from '../../types'
import { executeEvmTransaction, executeSolanaTransaction } from '../../utils'
import { executeSolanaMessage } from './executeSolanaMessage'

export const bebopSwapper: Swapper = {
  executeEvmTransaction,
  executeSolanaTransaction,
  executeSolanaMessage,
}
