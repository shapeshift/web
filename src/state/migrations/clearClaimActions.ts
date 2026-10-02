import type { PersistPartial } from 'redux-persist/es/persistReducer'

import type { Action, ActionState } from '@/state/slices/actionSlice/types'
import { ActionStatus, ActionType } from '@/state/slices/actionSlice/types'

const clearClaimAction = (action: Action): Action | undefined => {
  switch (action.type) {
    case ActionType.ArbitrumBridgeWithdraw:
    case ActionType.RfoxClaim:
    case ActionType.TcyClaim:
      return
    case ActionType.Swap:
      return action.status === ActionStatus.Initiated
        ? { ...action, status: ActionStatus.Complete }
        : action
    default:
      return action
  }
}

export const clearClaimActions = (state: ActionState): ActionState & PersistPartial => {
  const byId = Object.values(state.byId).reduce<ActionState['byId']>((acc, action) => {
    const migrated = clearClaimAction(action)
    if (migrated) acc[migrated.id] = migrated
    return acc
  }, {})

  return {
    ...state,
    byId,
    ids: state.ids.filter(id => Boolean(byId[id])),
  } as ActionState & PersistPartial
}
