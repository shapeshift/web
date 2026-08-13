import type { SwapMachineEvent } from '../machines/types'

export type DepositStatusResponse = {
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'
  txHash?: string
}

// The api backfills txHash from the provider once it sees the deposit, so its arrival is what
// tells us funds landed - the depositor never reports back to the widget
export const resolveDepositStatusEvent = (
  response: DepositStatusResponse,
  hasDetectedDeposit: boolean,
): SwapMachineEvent | undefined => {
  if (response.status === 'failed') return { type: 'STATUS_FAILED', error: 'Swap failed' }
  if (response.status === 'confirmed') return { type: 'STATUS_CONFIRMED' }
  if (!hasDetectedDeposit && response.txHash) {
    return { type: 'DEPOSIT_DETECTED', txHash: response.txHash }
  }
}
