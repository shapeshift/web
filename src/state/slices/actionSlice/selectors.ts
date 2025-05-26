import { actionCenterSlice } from './actionSlice'
import { ActionStatus, isTradePayloadDiscriminator } from './types'

import { createDeepEqualOutputSelector } from '@/state/selector-utils'
import { selectSwapIdParamFromFilter } from '@/state/selectors'

export const selectActions = actionCenterSlice.selectors.selectActions

export const selectInitializedActionsByUpdatedAtDesc = createDeepEqualOutputSelector(
  selectActions,
  actions => {
    return [...actions].sort((a, b) => b.updatedAt - a.updatedAt)
  },
)

export const selectPendingActions = createDeepEqualOutputSelector(selectActions, actions => {
  return actions.filter(action => action.status === ActionStatus.Pending)
})

export const selectActionIds = createDeepEqualOutputSelector(selectActions, actions => {
  return actions.map(action => action.id)
})

export const selectActionSwapIds = createDeepEqualOutputSelector(selectPendingActions, actions => {
  return actions.filter(isTradePayloadDiscriminator).map(action => action.metadata?.swapId)
})

export const selectActionBySwapId = createDeepEqualOutputSelector(
  selectActions,
  selectSwapIdParamFromFilter,
  (actions, swapId) => {
    return actions.find(
      action => isTradePayloadDiscriminator(action) && action.metadata?.swapId === swapId,
    )
  },
)
