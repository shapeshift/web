import type { FoxFarmingWithdrawActions, FoxFarmingWithdrawState } from './WithdrawCommon'
import { FoxFarmingWithdrawActionType } from './WithdrawCommon'

export const initialState: FoxFarmingWithdrawState = {
  txid: null,
  opportunity: null,
  userAddress: null,
  loading: false,
  approve: {},
  withdraw: {
    lpAmount: '',
    txStatus: 'pending',
    usedGasFee: '',
    isExiting: false,
  },
}

export const reducer = (
  state: FoxFarmingWithdrawState,
  action: FoxFarmingWithdrawActions,
): FoxFarmingWithdrawState => {
  switch (action.type) {
    case FoxFarmingWithdrawActionType.SET_OPPORTUNITY:
      return { ...state, opportunity: { ...state.opportunity, ...action.payload } }
    case FoxFarmingWithdrawActionType.SET_WITHDRAW:
      return { ...state, withdraw: { ...state.withdraw, ...action.payload } }
    case FoxFarmingWithdrawActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case FoxFarmingWithdrawActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case FoxFarmingWithdrawActionType.SET_APPROVE:
      return { ...state, approve: action.payload }
    case FoxFarmingWithdrawActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
