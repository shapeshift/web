import { selectEnabledWalletAccountIds } from '../common-selectors'
import { swapSlice } from '../swapSlice/swapSlice'
import { actionSlice } from './actionSlice'
import {
  ActionStatus,
  ActionType,
  isLimitOrderAction,
  isPendingSwapAction,
  isSwapAction,
} from './types'

import { createDeepEqualOutputSelector } from '@/state/selector-utils'
import {
  selectCowSwapQuoteIdParamFromRequiredFilter,
  selectLimitOrderIdParamFromFilter,
  selectSwapIdParamFromFilter,
} from '@/state/selectors'

export const selectWalletActions = createDeepEqualOutputSelector(
  actionSlice.selectors.selectActions,
  selectEnabledWalletAccountIds,
  swapSlice.selectors.selectSwapsById,
  (actions, enabledWalletAccountIds, swapsById) => {
    return actions.filter(action => {
      if (isSwapAction(action)) {
        const swapId = action.swapMetadata.swapId
        const relatedSwap = swapsById[swapId]

        if (!relatedSwap?.sellAccountId) return false

        return enabledWalletAccountIds.includes(relatedSwap.sellAccountId)
      }

      if (isLimitOrderAction(action)) {
        return enabledWalletAccountIds.includes(action.limitOrderMetadata.accountId)
      }

      return action
    })
  },
)

export const selectInitializedActionsByUpdatedAtDesc = createDeepEqualOutputSelector(
  selectWalletActions,
  actions => {
    return actions
      .filter(action => action.status !== ActionStatus.Idle)
      .sort((a, b) => b.updatedAt - a.updatedAt)
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
    return actions.filter(isPendingSwapAction)
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

export const selectOpenLimitOrderActionsFilteredByWallet = createDeepEqualOutputSelector(
  actionSlice.selectors.selectActions,
  selectEnabledWalletAccountIds,
  (actions, enabledWalletAccountIds) => {
    return actions.filter(
      action =>
        action.status === ActionStatus.Open &&
        action.type === ActionType.LimitOrder &&
        ((action.limitOrderMetadata.accountId &&
          enabledWalletAccountIds.includes(action.limitOrderMetadata.accountId)) ||
          !action.limitOrderMetadata.accountId),
    )
  },
)

export const selectLimitOrderActionByLimitOrderId = createDeepEqualOutputSelector(
  actionSlice.selectors.selectActions,
  selectLimitOrderIdParamFromFilter,
  (actions, limitOrderId) => {
    return actions.find(
      action =>
        isLimitOrderAction(action) && action.limitOrderMetadata.limitOrderId === limitOrderId,
    )
  },
)

export const selectLimitOrderActionByCowSwapQuoteId = createDeepEqualOutputSelector(
  actionSlice.selectors.selectActions,
  selectCowSwapQuoteIdParamFromRequiredFilter,
  (actions, cowSwapQuoteId) => {
    return actions.find(
      action =>
        isLimitOrderAction(action) && action.limitOrderMetadata.cowSwapQuoteId === cowSwapQuoteId,
    )
  },
)
