import type { Swapper } from '../../types'
import { executeEvmTransaction } from '../../utils'
import { executeSolanaMessage } from './executeSolanaMessage'

export const bebopSwapper: Swapper = {
  executeEvmTransaction,
  executeSolanaMessage,
}
