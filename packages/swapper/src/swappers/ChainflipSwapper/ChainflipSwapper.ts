import type { Swapper } from '../../types'
import {
  executeEvmTransaction,
  executeSolanaTransaction,
  executeTronTransaction,
} from '../../utils'

export const chainflipSwapper: Swapper = {
  supportsExternalPayment: true,
  executeEvmTransaction,
  executeSolanaTransaction,
  executeTronTransaction,
  executeUtxoTransaction: (txToSign, { signAndBroadcastTransaction }) => {
    return signAndBroadcastTransaction(txToSign)
  },
}
