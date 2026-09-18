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
      txLink: response.txLink,
      swapperTxLink: response.swapperTxLink,
    }
  }
  if (response.status === 'confirmed') {
    return {
      type: 'STATUS_CONFIRMED',
      txLink: response.txLink,
      buyTxLink: response.buyTxLink,
      swapperTxLink: response.swapperTxLink,
    }
  }
}

type KnownTxLinks = {
  txLink: string | null | undefined
  swapperTxLink: string | null | undefined
}

// The api owns both links: the sell one lands with the hash, the swapper's once it sees the funds
export const resolveTxLinksEvent = (
  response: SwapStatusResponse,
  known: KnownTxLinks,
): SwapMachineEvent | undefined => {
  const txLink = response.txLink !== known.txLink ? response.txLink : undefined
  const swapperTxLink =
    response.swapperTxLink !== known.swapperTxLink ? response.swapperTxLink : undefined

  if (!txLink && !swapperTxLink) return

  return { type: 'TX_LINKS_UPDATED', txLink, swapperTxLink }
}

export const resolveDepositStatusEvent = (
  response: SwapStatusResponse,
  hasDetectedDeposit: boolean,
  observedAt: number,
  knownTxLink?: string | null,
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

  // Before detection the links ride along on DEPOSIT_DETECTED
  if (hasDetectedDeposit) {
    return resolveTxLinksEvent(response, { txLink: knownTxLink, swapperTxLink: knownSwapperTxLink })
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
