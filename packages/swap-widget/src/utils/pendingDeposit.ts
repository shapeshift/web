import type { QuoteResponse } from '../types'
import { shouldKeepTrackingDeposit } from './depositStatus'

const STORAGE_KEY = 'ssw:pendingDeposit'

export type PendingDeposit = {
  quote: QuoteResponse
  // Only ever the refund destination - a deposit is paid from whatever wallet the user chooses
  refundAddress: string
  // Not carried on the quote, and the deposit screen shows it back to the user
  receiveAddress: string
  // Whichever side drove the quote, so a re-quote after expiry asks for the same thing
  sellAmountBaseUnit: string | undefined
  buyAmountBaseUnit: string | undefined
  // Set once the provider reports the deposit, so a restore rejoins settlement rather than re-asking
  txHash: string | undefined
  // Persisted with it, so a reload resumes the settlement window instead of restarting it
  depositObservedAt: number | undefined
}

const isRestorableAsset = (value: unknown): boolean => {
  const asset = value as { chainId?: unknown; precision?: unknown } | null
  return typeof asset?.chainId === 'string' && typeof asset.precision === 'number'
}

// Restoration dereferences all of these, so a half-written entry has to be rejected, not crash
const isPendingDeposit = (value: unknown): value is PendingDeposit => {
  const candidate = value as PendingDeposit | null
  const quote = candidate?.quote

  return (
    !!quote?.depositAddress &&
    typeof quote.expiresAt === 'number' &&
    typeof quote.sellAmountCryptoBaseUnit === 'string' &&
    typeof quote.buyAmountAfterFeesCryptoBaseUnit === 'string' &&
    isRestorableAsset(quote.sellAsset) &&
    isRestorableAsset(quote.buyAsset) &&
    typeof candidate?.refundAddress === 'string' &&
    typeof candidate.receiveAddress === 'string' &&
    // A funded deposit without its observation time has no settlement window to resume
    (!candidate.txHash || typeof candidate.depositObservedAt === 'number')
  )
}

export const clearPendingDeposit = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clean up when storage is unavailable
  }
}

export const savePendingDeposit = (deposit: PendingDeposit): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deposit))
  } catch {
    // Storage is unavailable in some embeds - the deposit screen still works for this session
  }
}

export const loadPendingDeposit = (now: number): PendingDeposit | undefined => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return

    const parsed: unknown = JSON.parse(raw)

    const isRestorable =
      isPendingDeposit(parsed) &&
      shouldKeepTrackingDeposit({
        quoteDeadline: parsed.quote.expiresAt,
        depositObservedAt: parsed.depositObservedAt,
        now,
      })

    if (!isRestorable) {
      clearPendingDeposit()
      return
    }

    return parsed
  } catch {
    clearPendingDeposit()
  }
}
