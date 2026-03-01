import type { Swapper } from '../../types'
import { executeEvmTransaction } from '../../utils'

export const debridgeSwapper: Swapper = {
  executeEvmTransaction,
}
