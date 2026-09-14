import type { SwapperName } from '@shapeshiftoss/swapper'
import { swappers } from '@shapeshiftoss/swapper'

export const isExternalPaymentSwapper = (swapperName: string): boolean =>
  swappers[swapperName as SwapperName]?.supportsExternalPayment === true
