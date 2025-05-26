import type { Swap } from '@shapeshiftoss/swapper'

export type SwapState = {
  swaps: Swap[]
}

export type UpdateSwapPayload = Partial<Swap> & { id: string }
