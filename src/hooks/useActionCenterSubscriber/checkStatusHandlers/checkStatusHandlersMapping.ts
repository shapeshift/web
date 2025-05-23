import { getTradeStatusHandler } from './getTradeStatusHandler'
import type { CheckStatusHandlerProps } from './types'

import { ActionCenterType } from '@/state/slices/actionSlice/types'

export const checkStatusHandlersMapping = {
  [ActionCenterType.Swap]: (props: CheckStatusHandlerProps) => getTradeStatusHandler(props),
  [ActionCenterType.Limit]: undefined,
  [ActionCenterType.Deposit]: undefined,
  [ActionCenterType.Claim]: undefined,
} as const
