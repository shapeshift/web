import type { SwapMachineEvent } from '../machines/types'

export type DepositStatusResponse = {
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'
  txHash?: string
}

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
