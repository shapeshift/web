import type { Swapper } from '../../types'
import { executeEvmTransaction, executeTronTransaction } from '../../utils'

export const bobGatewaySwapper: Swapper = {
  executeEvmTransaction,
  executeUtxoTransaction: (txToSign, { signAndBroadcastTransaction }) =>
    signAndBroadcastTransaction(txToSign),
  executeTronTransaction,
}
