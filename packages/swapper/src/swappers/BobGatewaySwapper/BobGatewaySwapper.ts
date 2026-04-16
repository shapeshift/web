import type { Swapper } from '../../types'
import { executeEvmTransaction } from '../../utils'

export const bobGatewaySwapper: Swapper = {
  executeEvmTransaction,
}
