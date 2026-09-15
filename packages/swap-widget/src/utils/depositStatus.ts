import type { SwapMachineEvent } from '../machines/types'

export type DepositStatusResponse = {
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'
  txHash?: string
  txLink?: string
  buyTxLink?: string
  swapperTxLink?: string
}

export const resolveDepositStatusEvent = (
  response: DepositStatusResponse,
  hasDetectedDeposit: boolean,
  observedAt: number,
): SwapMachineEvent | undefined => {
  if (!hasDetectedDeposit && response.txHash) {
    return {
      type: 'DEPOSIT_DETECTED',
      txHash: response.txHash,
      txLink: response.txLink,
      swapperTxLink: response.swapperTxLink,
      observedAt,
    }
  }
  if (response.status === 'failed') return { type: 'STATUS_FAILED', error: 'Swap failed' }
  if (response.status === 'confirmed') {
    return {
      type: 'STATUS_CONFIRMED',
      buyTxLink: response.buyTxLink,
      swapperTxLink: response.swapperTxLink,
    }
  }
}

// A deposit landing this long past the deadline may still be credited, so the window outlasts it
const UNFUNDED_DEPOSIT_TRACKING_MS = 60 * 60 * 1000

// Timed from the deposit - the api abandons an unsettled swap a day after registration
const SETTLEMENT_TRACKING_MS = 24 * 60 * 60 * 1000

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
