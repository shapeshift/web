import type { RunePoolWithdrawActions, RunePoolWithdrawState } from './WithdrawCommon'
import { RunePoolWithdrawActionType } from './WithdrawCommon'

export const initialState: RunePoolWithdrawState = {
  txid: null,
  opportunity: null,
  loading: false,
  withdraw: {
    fiatAmount: '',
    cryptoAmount: '',
    slippage: '',
    txStatus: 'pending',
    networkFeeCryptoBaseUnit: '',
  },
}

export const reducer = (
  state: RunePoolWithdrawState,
  action: RunePoolWithdrawActions,
): RunePoolWithdrawState => {
  switch (action.type) {
    case RunePoolWithdrawActionType.SET_OPPORTUNITY:
      return { ...state, opportunity: { ...state.opportunity, ...action.payload } }
    case RunePoolWithdrawActionType.SET_WITHDRAW:
      return { ...state, withdraw: { ...state.withdraw, ...action.payload } }
    case RunePoolWithdrawActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case RunePoolWithdrawActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
