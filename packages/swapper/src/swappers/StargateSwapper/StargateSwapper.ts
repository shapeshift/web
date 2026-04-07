import type { Swapper } from '../../types'
import { executeEvmTransaction } from '../../utils'

export const stargateSwapper: Swapper = {
  executeEvmTransaction,
}
