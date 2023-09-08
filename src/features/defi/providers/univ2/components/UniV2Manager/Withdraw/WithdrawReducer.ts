import type { UniV2WithdrawActions, UniV2WithdrawState } from './WithdrawCommon'
import { UniV2WithdrawActionType } from './WithdrawCommon'

export const initialState: UniV2WithdrawState = {
  txid: null,
  loading: false,
  approve: {},
  withdraw: {
    lpAmount: '',
    lpFiatAmount: '',
    asset1Amount: '',
    asset0Amount: '',
    txStatus: 'pending',
    usedGasFeeCryptoPrecision: '',
  },
}

export const reducer = (
  state: UniV2WithdrawState,
  action: UniV2WithdrawActions,
): UniV2WithdrawState => {
  switch (action.type) {
    case UniV2WithdrawActionType.SET_WITHDRAW:
      return { ...state, withdraw: { ...state.withdraw, ...action.payload } }
    case UniV2WithdrawActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case UniV2WithdrawActionType.SET_APPROVE:
      return { ...state, approve: action.payload }
    case UniV2WithdrawActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
