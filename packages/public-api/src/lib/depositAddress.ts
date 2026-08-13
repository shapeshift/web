import type { SwapperName } from '@shapeshiftoss/swapper'
import { swappers } from '@shapeshiftoss/swapper'

export const isDepositAddressSwapper = (swapperName: string): boolean =>
  swappers[swapperName as SwapperName]?.supportsDepositAddress === true
