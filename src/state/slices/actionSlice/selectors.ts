import { selectEnabledWalletAccountIds } from '../common-selectors'
import { actionCenterSlice } from './actionSlice'
import {
  ActionStatus,
  isLimitOrderPayloadDiscriminator,
  isTradePayloadDiscriminator,
} from './types'

import { createDeepEqualOutputSelector } from '@/state/selector-utils'
import { selectSwapIdParamFromFilter } from '@/state/selectors'

export const selectActions = actionCenterSlice.selectors.selectActions

export const selectInitializedActionsByUpdatedAtDescFilteredByWallet =
  createDeepEqualOutputSelector(
    selectActions,
    selectEnabledWalletAccountIds,
    (actions, enabledWalletAccountIds) => {
      return [...actions]
        .filter(
          action =>
            (action.initiatorAccountId &&
              enabledWalletAccountIds.includes(action.initiatorAccountId)) ||
            !action.initiatorAccountId,
        )
        .sort((a, b) => b.updatedAt - a.updatedAt)
    },
  )

export const selectPendingActionsFilteredByWallet = createDeepEqualOutputSelector(
  selectActions,
  selectEnabledWalletAccountIds,
  (actions, enabledWalletAccountIds) => {
    return actions.filter(
      action =>
        action.status === ActionStatus.Pending &&
        ((action.initiatorAccountId &&
          enabledWalletAccountIds.includes(action.initiatorAccountId)) ||
          !action.initiatorAccountId),
    )
  },
)

export const selectPendingSwapActionsFilteredByWallet = createDeepEqualOutputSelector(
  selectActions,
  selectEnabledWalletAccountIds,
  (actions, enabledWalletAccountIds) => {
    return actions.filter(
      action =>
        (action.status === ActionStatus.Pending || action.status === ActionStatus.Open) &&
        ((action.initiatorAccountId &&
          enabledWalletAccountIds.includes(action.initiatorAccountId)) ||
          !action.initiatorAccountId),
    )
  },
)

export const selectOpenLimitOrderActionsFilteredByWallet = createDeepEqualOutputSelector(
  selectActions,
  selectEnabledWalletAccountIds,
  (actions, enabledWalletAccountIds) => {
    return actions.filter(
      action =>
        action.status === ActionStatus.Open &&
        isLimitOrderPayloadDiscriminator(action) &&
        ((action.initiatorAccountId &&
          enabledWalletAccountIds.includes(action.initiatorAccountId)) ||
          !action.initiatorAccountId),
    )
  },
)

export const selectActionBySwapId = createDeepEqualOutputSelector(
  selectActions,
  selectSwapIdParamFromFilter,
  (actions, swapId) => {
    return actions.find(
      action => isTradePayloadDiscriminator(action) && action.metadata?.swapId === swapId,
    )
  },
)
