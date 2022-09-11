import type { YearnWithdrawActions, YearnWithdrawState } from './WithdrawCommon'
import { YearnWithdrawActionType } from './WithdrawCommon'

export const initialState: YearnWithdrawState = {
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
  state: YearnWithdrawState,
  action: YearnWithdrawActions,
): YearnWithdrawState => {
  switch (action.type) {
    case YearnWithdrawActionType.SET_OPPORTUNITY:
      return { ...state, opportunity: { ...state.opportunity, ...action.payload } }
    case YearnWithdrawActionType.SET_WITHDRAW:
      return { ...state, withdraw: { ...state.withdraw, ...action.payload } }
    case YearnWithdrawActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case YearnWithdrawActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case YearnWithdrawActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
