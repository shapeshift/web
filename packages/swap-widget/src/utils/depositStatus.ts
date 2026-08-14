import type { SwapMachineEvent } from '../machines/types'

export type DepositStatusResponse = {
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'
  txHash?: string
}

export const resolveDepositStatusEvent = (
  response: DepositStatusResponse,
  hasDetectedDeposit: boolean,
  observedAt: number,
): SwapMachineEvent | undefined => {
  if (!hasDetectedDeposit && response.txHash) {
    return { type: 'DEPOSIT_DETECTED', txHash: response.txHash, observedAt }
  }
  if (response.status === 'failed') return { type: 'STATUS_FAILED', error: 'Swap failed' }
  if (response.status === 'confirmed') return { type: 'STATUS_CONFIRMED' }
}

// The api keeps an unfunded quote this long past its deadline, and a late deposit still counts
const UNFUNDED_DEPOSIT_TRACKING_MS = 60 * 60 * 1000

// Timed from the deposit - the api drops the quote this long after binding its hash
const SETTLEMENT_TRACKING_MS = 60 * 60 * 1000

type ShouldKeepTrackingArgs = {
  quoteDeadline: number
  depositObservedAt: number | undefined
  now: number
}

export const shouldKeepTrackingDeposit = ({
  quoteDeadline,
  depositObservedAt,
  now,
}: ShouldKeepTrackingArgs): boolean =>
  depositObservedAt
    ? now <= depositObservedAt + SETTLEMENT_TRACKING_MS
    : now <= quoteDeadline + UNFUNDED_DEPOSIT_TRACKING_MS
