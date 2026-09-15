import type { SwapMachineEvent } from '../machines/types'
import { GENERIC_ERROR_MESSAGE } from './errors'

export type SwapStatusResponse = {
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'
  txHash?: string
  txLink?: string
  buyTxLink?: string
  swapperTxLink?: string
}

export const resolveSettledSwapEvent = (
  response: SwapStatusResponse,
): SwapMachineEvent | undefined => {
  if (response.status === 'failed') {
    return {
      type: 'STATUS_FAILED',
      error: GENERIC_ERROR_MESSAGE,
      swapperTxLink: response.swapperTxLink,
    }
  }
  if (response.status === 'confirmed') {
    return {
      type: 'STATUS_CONFIRMED',
      buyTxLink: response.buyTxLink,
      swapperTxLink: response.swapperTxLink,
    }
  }
}

export const resolveDepositStatusEvent = (
  response: SwapStatusResponse,
  hasDetectedDeposit: boolean,
  observedAt: number,
  knownSwapperTxLink?: string | null,
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

  const settledEvent = resolveSettledSwapEvent(response)
  if (settledEvent) return settledEvent

  // Some providers only have a page once they've seen the deposit, which can land after detection
  if (
    hasDetectedDeposit &&
    response.swapperTxLink &&
    response.swapperTxLink !== knownSwapperTxLink
  ) {
    return { type: 'SWAPPER_TX_LINK_UPDATED', swapperTxLink: response.swapperTxLink }
  }
}

// A deposit landing this long past the deadline may still be credited, so the window outlasts it
const UNFUNDED_DEPOSIT_TRACKING_MS = 60 * 60 * 1000

// The api abandons an unsettled swap a day after registration
const SETTLEMENT_TRACKING_MS = 24 * 60 * 60 * 1000

export const isWithinSettlementWindow = (startedAt: number, now: number): boolean =>
  now <= startedAt + SETTLEMENT_TRACKING_MS

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
    ? isWithinSettlementWindow(depositObservedAt, now)
    : now <= quoteDeadline + UNFUNDED_DEPOSIT_TRACKING_MS
