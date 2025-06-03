import type { Swap } from '@shapeshiftoss/swapper'

export type SwapState = {
  byId: Record<string, Swap>
  ids: string[]
  currentSwapId: string | null
}
