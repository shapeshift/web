import type { Swapper } from '../../types'
import {
  executeEvmTransaction,
  executeSolanaTransaction,
  executeTronTransaction,
} from '../../utils'

export const nearIntentsSwapper: Swapper = {
  executeEvmTransaction,
  executeSolanaTransaction,
  executeTronTransaction,
  executeUtxoTransaction: (txToSign, { signAndBroadcastTransaction }) => {
    return signAndBroadcastTransaction(txToSign)
  },
}
