import type { Swapper } from '../../types'
import {
  executeEvmTransaction,
  executeSolanaTransaction,
  executeSuiTransaction,
  executeTronTransaction,
} from '../../utils'

export const nearIntentsSwapper: Swapper = {
  executeEvmTransaction,
  executeSolanaTransaction,
  executeTronTransaction,
  executeSuiTransaction,
  executeUtxoTransaction: (txToSign, { signAndBroadcastTransaction }) => {
    return signAndBroadcastTransaction(txToSign)
  },
}
