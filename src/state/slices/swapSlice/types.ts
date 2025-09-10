import type { Swap } from '@shapeshiftoss/swapper'
import type { PartialRecord } from '@shapeshiftoss/types'

export type SwapState = {
  byId: PartialRecord<string, Swap>
  ids: string[]
  activeSwapId: string | null
}
