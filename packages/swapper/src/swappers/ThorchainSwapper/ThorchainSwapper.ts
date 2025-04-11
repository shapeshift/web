import type { StdSignDoc } from '@keplr-wallet/types'
import type { BTCSignTx } from '@shapeshiftoss/hdwallet-core'

import type {
  CosmosSdkTransactionExecutionProps,
  Swapper,
  UtxoTransactionExecutionProps,
} from '../../types'
import { executeEvmTransaction } from '../../utils'

export const thorchainSwapper: Swapper = {
  executeEvmTransaction,

  executeCosmosSdkTransaction: async (
    txToSign: StdSignDoc,
    { signAndBroadcastTransaction }: CosmosSdkTransactionExecutionProps,
  ): Promise<string> => {
    return await signAndBroadcastTransaction(txToSign)
  },

  executeUtxoTransaction: async (
    txToSign: BTCSignTx,
    { signAndBroadcastTransaction }: UtxoTransactionExecutionProps,
  ): Promise<string> => {
    return await signAndBroadcastTransaction(txToSign)
  },
}
