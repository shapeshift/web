import type { Swapper } from '../../types'
import {
  executeEvmTransaction,
  executeNearTransaction,
  executeSolanaTransaction,
  executeStarknetTransaction,
  executeSuiTransaction,
  executeTronTransaction,
} from '../../utils'

export const nearIntentsSwapper: Swapper = {
  executeEvmTransaction,
  executeSolanaTransaction,
  executeStarknetTransaction,
  executeTronTransaction,
  executeSuiTransaction,
  executeNearTransaction,
  executeUtxoTransaction: (txToSign, { signAndBroadcastTransaction }) => {
    return signAndBroadcastTransaction(txToSign)
  },
}
