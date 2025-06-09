import { selectEnabledWalletAccountIds } from '../common-selectors'
import { swapSlice } from '../swapSlice/swapSlice'
import { actionSlice } from './actionSlice'
import { ActionStatus, isSwapAction } from './types'

import { createDeepEqualOutputSelector } from '@/state/selector-utils'
import { selectSwapIdParamFromFilter } from '@/state/selectors'

export const selectWalletActions = createDeepEqualOutputSelector(
  actionSlice.selectors.selectActions,
  selectEnabledWalletAccountIds,
  swapSlice.selectors.selectSwapsById,
  (actions, enabledWalletAccountIds, swapsById) => {
    return actions.filter(action => {
      if (!isSwapAction(action)) return action

      const swapId = action.swapMetadata.swapId
      const relatedSwap = swapsById[swapId]

      if (!relatedSwap?.sellAccountId) return false

      return enabledWalletAccountIds.includes(relatedSwap.sellAccountId)
    })
  },
)

export const selectWalletActionsSorted = createDeepEqualOutputSelector(
  selectWalletActions,
  actions => {
    return actions.sort((a, b) => b.updatedAt - a.updatedAt)
  },
)

export const selectWalletHasPendingActions = createDeepEqualOutputSelector(
  selectWalletActions,
  actions => {
    return actions.filter(action => action.status === ActionStatus.Pending).length > 0
  },
)

export const selectPendingSwapActions = createDeepEqualOutputSelector(
  selectWalletActions,
  actions => {
    return actions
      .filter(action => isSwapAction(action))
      .filter(action => action.status === ActionStatus.Pending)
  },
)

export const selectSwapActionBySwapId = createDeepEqualOutputSelector(
  actionSlice.selectors.selectActionsById,
  actionSlice.selectors.selectActionIds,
  selectSwapIdParamFromFilter,
  (actionsById, actionIds, swapId) => {
    const actionId = actionIds.find(id => {
      const action = actionsById[id]
      return isSwapAction(action) && action.swapMetadata.swapId === swapId
    })

    if (!actionId) return

    return actionsById[actionId]
  },
)
