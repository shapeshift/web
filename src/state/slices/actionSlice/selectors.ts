import { selectEnabledWalletAccountIds } from '../common-selectors'
import { swapSlice } from '../swapSlice/swapSlice'
import { actionSlice } from './actionSlice'
import type { LimitOrderAction, RfoxClaimAction, TcyClaimAction } from './types'
import {
  ActionStatus,
  ActionType,
  isGenericTransactionAction,
  isLimitOrderAction,
  isPendingSwapAction,
  isRfoxClaimAction,
  isSwapAction,
  isTcyClaimAction,
} from './types'

import { createDeepEqualOutputSelector } from '@/state/selector-utils'
import {
  selectCowSwapQuoteIdParamFromRequiredFilter,
  selectSwapIdParamFromFilter,
} from '@/state/selectors'

export const selectActions = createDeepEqualOutputSelector(
  actionSlice.selectors.selectActionsById,
  actionSlice.selectors.selectActionIds,
  (actionsById, actionIds) => actionIds.map(id => actionsById[id]),
)

export const selectWalletActions = createDeepEqualOutputSelector(
  selectActions,
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

      if (isGenericTransactionAction(action)) {
        return enabledWalletAccountIds.includes(action.transactionMetadata.accountId)
      }

      if (isRfoxClaimAction(action)) {
        return enabledWalletAccountIds.includes(
          action.rfoxClaimActionMetadata.request.stakingAssetAccountId,
        )
      }

      if (isTcyClaimAction(action)) {
        return enabledWalletAccountIds.includes(action.tcyClaimActionMetadata.claim.accountId)
      }

      return action
    })
  },
)

export const selectWalletActionsSorted = createDeepEqualOutputSelector(
  selectWalletActions,
  actions => {
    return actions
      .filter(action => action.status !== ActionStatus.Idle)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  },
)

export const selectWalletPendingActions = createDeepEqualOutputSelector(
  selectWalletActions,
  actions => {
    return actions.filter(action => action.status === ActionStatus.Pending)
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
  selectActions,
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

export const selectLimitOrderActionByCowSwapQuoteId = createDeepEqualOutputSelector(
  selectActions,
  selectCowSwapQuoteIdParamFromRequiredFilter,
  (actions, cowSwapQuoteId) => {
    return actions.find(
      action =>
        isLimitOrderAction(action) && action.limitOrderMetadata.cowSwapQuoteId === cowSwapQuoteId,
    )
  },
)

export const selectLimitOrderActionsByWallet = createDeepEqualOutputSelector(
  selectActions,
  selectEnabledWalletAccountIds,
  (actions, enabledWalletAccountIds) => {
    return actions.filter(
      (action): action is LimitOrderAction =>
        isLimitOrderAction(action) &&
        enabledWalletAccountIds.includes(action.limitOrderMetadata.accountId),
    )
  },
)

export const selectRfoxClaimActionsByWallet = createDeepEqualOutputSelector(
  selectActions,
  selectEnabledWalletAccountIds,
  (actions, enabledWalletAccountIds) => {
    return actions.filter(
      (action): action is RfoxClaimAction =>
        isRfoxClaimAction(action) &&
        enabledWalletAccountIds.includes(
          action.rfoxClaimActionMetadata.request.stakingAssetAccountId,
        ),
    )
  },
)

export const selectPendingRfoxClaimActions = createDeepEqualOutputSelector(
  selectRfoxClaimActionsByWallet,
  actions => {
    return actions.filter(action => action.status === ActionStatus.Pending)
  },
)

export const selectTcyClaimActionsByWallet = createDeepEqualOutputSelector(
  selectActions,
  selectEnabledWalletAccountIds,
  (actions, enabledWalletAccountIds) => {
    return actions.filter(
      (action): action is TcyClaimAction =>
        isTcyClaimAction(action) &&
        enabledWalletAccountIds.includes(action.tcyClaimActionMetadata.claim.accountId),
    )
  },
)

export const selectPendingTcyClaimActions = createDeepEqualOutputSelector(
  selectTcyClaimActionsByWallet,
  actions => {
    return actions.filter(action => action.status === ActionStatus.Pending)
  },
)
