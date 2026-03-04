import type { Swapper } from '../../types'
import {
  executeEvmTransaction,
  executeNearTransaction,
  executeSolanaTransaction,
  executeStarknetTransaction,
  executeSuiTransaction,
  executeTonTransaction,
  executeTronTransaction,
} from '../../utils'

export const nearIntentsSwapper: Swapper = {
  executeEvmTransaction,
  executeSolanaTransaction,
  executeStarknetTransaction,
  executeTronTransaction,
  executeSuiTransaction,
  executeNearTransaction,
  executeTonTransaction,
  executeUtxoTransaction: (txToSign, { signAndBroadcastTransaction }) => {
    return signAndBroadcastTransaction(txToSign)
  },
}
