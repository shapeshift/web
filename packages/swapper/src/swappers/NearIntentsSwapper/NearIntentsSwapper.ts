import type { Swapper } from '../../types'
import {
  executeAptosTransaction,
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
  executeAptosTransaction,
  executeUtxoTransaction: (txToSign, { signAndBroadcastTransaction }) => {
    return signAndBroadcastTransaction(txToSign)
  },
}
