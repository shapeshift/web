import type { QuoteResponse } from '../types'

const STORAGE_KEY = 'ssw:pendingDeposit'

export type PendingDeposit = {
  quote: QuoteResponse
  sendAddress: string
  // Not carried on the quote, and the deposit screen shows it back to the user
  receiveAddress: string
  // Whichever side drove the quote, so a re-quote after expiry asks for the same thing
  sellAmountBaseUnit: string | undefined
  buyAmountBaseUnit: string | undefined
}

const isPendingDeposit = (value: unknown): value is PendingDeposit => {
  const candidate = value as PendingDeposit | null
  return (
    !!candidate?.quote?.depositAddress &&
    typeof candidate.quote.expiresAt === 'number' &&
    typeof candidate.sendAddress === 'string' &&
    typeof candidate.receiveAddress === 'string'
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

// Only the pre-deposit window is recoverable: the address can't be recreated and is needed to pay
export const loadPendingDeposit = (now: number): PendingDeposit | undefined => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined

    const parsed: unknown = JSON.parse(raw)
    if (!isPendingDeposit(parsed) || parsed.quote.expiresAt <= now) {
      clearPendingDeposit()
      return undefined
    }

    return parsed
  } catch {
    clearPendingDeposit()
    return undefined
  }
}
