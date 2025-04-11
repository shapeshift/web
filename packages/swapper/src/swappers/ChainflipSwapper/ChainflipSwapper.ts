import type { BTCSignTx } from '@shapeshiftoss/hdwallet-core'

import type { Swapper, UtxoTransactionExecutionProps } from '../../types'
import { executeEvmTransaction, executeSolanaTransaction } from '../../utils'

export const chainflipSwapper: Swapper = {
  executeEvmTransaction,
  executeSolanaTransaction,

  executeUtxoTransaction: async (
    txToSign: BTCSignTx,
    { signAndBroadcastTransaction }: UtxoTransactionExecutionProps,
  ): Promise<string> => {
    return await signAndBroadcastTransaction(txToSign)
  },
}
