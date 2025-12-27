import type { Swapper } from '../../types'
import {
  executeEvmTransaction,
  executeNearTransaction,
  executeSolanaTransaction,
  executeSuiTransaction,
  executeTronTransaction,
} from '../../utils'

export const nearIntentsSwapper: Swapper = {
  executeEvmTransaction,
  executeSolanaTransaction,
  executeTronTransaction,
  executeSuiTransaction,
  executeNearTransaction,
  executeUtxoTransaction: (txToSign, { signAndBroadcastTransaction }) => {
    return signAndBroadcastTransaction(txToSign)
  },
}
