import type { SwapMachineEvent } from '../machines/types'

export type DepositStatusResponse = {
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'
  txHash?: string
}

export const resolveDepositStatusEvent = (
  response: DepositStatusResponse,
  hasDetectedDeposit: boolean,
): SwapMachineEvent | undefined => {
  // Detection comes first even on a terminal response: awaiting_deposit has no STATUS_CONFIRMED
  // handler, so a deposit that lands and confirms inside one poll would strand the screen
  if (!hasDetectedDeposit && response.txHash) {
    return { type: 'DEPOSIT_DETECTED', txHash: response.txHash }
  }
  if (response.status === 'failed') return { type: 'STATUS_FAILED', error: 'Swap failed' }
  if (response.status === 'confirmed') return { type: 'STATUS_CONFIRMED' }
}

// The api keeps an unfunded quote for an hour past its deadline, so a deposit that never arrived
// has nothing left to report after that - only a deposit already seen is still worth following
const POST_EXPIRY_TRACKING_MS = 60 * 60 * 1000

type ShouldKeepTrackingArgs = {
  expiresAt: number
  hasDetectedDeposit: boolean
  now: number
}

export const shouldKeepTrackingDeposit = ({
  expiresAt,
  hasDetectedDeposit,
  now,
}: ShouldKeepTrackingArgs): boolean =>
  hasDetectedDeposit || now <= expiresAt + POST_EXPIRY_TRACKING_MS
