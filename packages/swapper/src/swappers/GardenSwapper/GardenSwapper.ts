import type { Swapper } from '../../types'
import { executeEvmTransaction, executeStarknetTransaction } from '../../utils'

export const gardenSwapper: Swapper = {
  executeEvmTransaction,
  executeStarknetTransaction,
  executeUtxoTransaction: (txToSign, { signAndBroadcastTransaction }) => {
    return signAndBroadcastTransaction(txToSign)
  },
}
