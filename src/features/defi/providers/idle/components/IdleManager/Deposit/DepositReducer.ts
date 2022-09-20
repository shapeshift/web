import type { IdleDepositActions, IdleDepositState } from './DepositCommon'
import { IdleDepositActionType } from './DepositCommon'

export const initialState: IdleDepositState = {
  txid: null,
  opportunity: null,
  userAddress: null,
  loading: false,
  approve: {},
  deposit: {
    fiatAmount: '',
    cryptoAmount: '',
    slippage: '',
    txStatus: 'pending',
    usedGasFee: '',
  },
}

export const reducer = (state: IdleDepositState, action: IdleDepositActions): IdleDepositState => {
  switch (action.type) {
    case IdleDepositActionType.SET_OPPORTUNITY:
      return { ...state, opportunity: { ...state.opportunity, ...action.payload } }
    case IdleDepositActionType.SET_APPROVE:
      return { ...state, approve: action.payload }
    case IdleDepositActionType.SET_DEPOSIT:
      return { ...state, deposit: { ...state.deposit, ...action.payload } }
    case IdleDepositActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case IdleDepositActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case IdleDepositActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
