import type { IdleWithdrawActions, IdleWithdrawState } from './WithdrawCommon'
import { IdleWithdrawActionType } from './WithdrawCommon'

export const initialState: IdleWithdrawState = {
  txid: null,
  opportunity: null,
  userAddress: null,
  loading: false,
  approve: {},
  withdraw: {
    fiatAmount: '',
    cryptoAmount: '',
    slippage: '',
    txStatus: 'pending',
    usedGasFee: '',
  },
}

export const reducer = (
  state: IdleWithdrawState,
  action: IdleWithdrawActions,
): IdleWithdrawState => {
  switch (action.type) {
    case IdleWithdrawActionType.SET_OPPORTUNITY:
      return { ...state, opportunity: { ...state.opportunity, ...action.payload } }
    case IdleWithdrawActionType.SET_WITHDRAW:
      return { ...state, withdraw: { ...state.withdraw, ...action.payload } }
    case IdleWithdrawActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case IdleWithdrawActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case IdleWithdrawActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
