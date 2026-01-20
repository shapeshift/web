import type { Swapper } from '../../types'

export const stonfiSwapper: Swapper = {
  executeTonTransaction: (txToSign, { signAndBroadcastTransaction }) => {
    return signAndBroadcastTransaction(txToSign)
  },
}
