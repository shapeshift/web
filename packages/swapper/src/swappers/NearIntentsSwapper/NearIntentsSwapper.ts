import type { Swapper } from '../../types'
import {
  executeEvmTransaction,
  executeSolanaTransaction,
  executeTronTransaction,
} from '../../utils'
import { executeEvmTransaction, executeSolanaTransaction, executeSuiTransaction } from '../../utils'

export const nearIntentsSwapper: Swapper = {
  executeEvmTransaction,
  executeSolanaTransaction,
  executeTronTransaction,
  executeSuiTransaction,
  executeUtxoTransaction: (txToSign, { signAndBroadcastTransaction }) => {
    return signAndBroadcastTransaction(txToSign)
  },
}
