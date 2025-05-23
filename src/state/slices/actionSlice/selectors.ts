import { actionCenterSlice } from './actionSlice'
import { ActionStatus } from './types'

import { createDeepEqualOutputSelector } from '@/state/selector-utils'

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
