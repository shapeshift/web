import type { CosmosWithdrawActions, CosmosWithdrawState } from './WithdrawCommon'
import { CosmosWithdrawActionType } from './WithdrawCommon'

export const initialState: CosmosWithdrawState = {
  txid: null,
  loading: false,
  withdraw: {
    fiatAmount: '',
    cryptoAmount: '',
    txStatus: 'pending',
  },
}

export const reducer = (state: CosmosWithdrawState, action: CosmosWithdrawActions) => {
  switch (action.type) {
    case CosmosWithdrawActionType.SET_WITHDRAW:
      return { ...state, withdraw: { ...state.withdraw, ...action.payload } }
    case CosmosWithdrawActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case CosmosWithdrawActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
