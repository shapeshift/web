import type { Swapper } from '../../types'
import { executeEvmTransaction } from '../../utils'

export const thorchainSwapper: Swapper = {
  executeEvmTransaction,
  executeCosmosSdkTransaction: (txToSign, { signAndBroadcastTransaction }) => {
    return signAndBroadcastTransaction(txToSign)
  },
  executeUtxoTransaction: (txToSign, { signAndBroadcastTransaction }) => {
    return signAndBroadcastTransaction(txToSign)
  },
  executeTronTransaction: (txToSign, { signAndBroadcastTransaction }) => {
    return signAndBroadcastTransaction(txToSign)
  },
}
