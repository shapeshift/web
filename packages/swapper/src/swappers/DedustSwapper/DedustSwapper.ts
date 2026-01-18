import type { Swapper } from '../../types'

export const dedustSwapper: Swapper = {
  executeTonTransaction: (txToSign, { signAndBroadcastTransaction }) => {
    return signAndBroadcastTransaction(txToSign)
  },
}
