import type { Swapper } from '../../types'
import { executeEvmTransaction, executeSolanaTransaction } from '../../utils'

export const chainflipSwapper: Swapper = {
  executeEvmTransaction,
  executeSolanaTransaction,
  executeUtxoTransaction: (txToSign, { signAndBroadcastTransaction }) => {
    return signAndBroadcastTransaction(txToSign)
  },
}
