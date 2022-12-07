import type { YearnDepositActions, YearnDepositState } from './DepositCommon'
import { YearnDepositActionType } from './DepositCommon'

export const initialState: YearnDepositState = {
  txid: null,
  opportunity: null,
  userAddress: null,
  loading: false,
  isExactAllowance: false,
  approve: {},
  deposit: {
    fiatAmount: '',
    cryptoAmount: '',
    slippage: '',
    txStatus: 'pending',
    usedGasFee: '',
  },
}

export const reducer = (
  state: YearnDepositState,
  action: YearnDepositActions,
): YearnDepositState => {
  switch (action.type) {
    case YearnDepositActionType.SET_OPPORTUNITY:
      return { ...state, opportunity: { ...state.opportunity, ...action.payload } }
    case YearnDepositActionType.SET_APPROVE:
      return { ...state, approve: action.payload }
    case YearnDepositActionType.SET_DEPOSIT:
      return { ...state, deposit: { ...state.deposit, ...action.payload } }
    case YearnDepositActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case YearnDepositActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case YearnDepositActionType.SET_IS_EXACT_ALLOWANCE:
      return { ...state, isExactAllowance: action.payload }
    case YearnDepositActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
