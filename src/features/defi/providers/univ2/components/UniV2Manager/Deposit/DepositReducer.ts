import type { UniV2DepositActions, UniV2DepositState } from './DepositCommon'
import { UniV2DepositActionType } from './DepositCommon'

export const initialState: UniV2DepositState = {
  txid: null,
  loading: false,
  deposit: {
    asset1FiatAmount: '',
    asset1CryptoAmount: '',
    asset0FiatAmount: '',
    asset0CryptoAmount: '',
    txStatus: 'pending',
    usedGasFeeCryptoPrecision: '',
  },
}

export const reducer = (
  state: UniV2DepositState,
  action: UniV2DepositActions,
): UniV2DepositState => {
  switch (action.type) {
    case UniV2DepositActionType.SET_APPROVE_0:
      return { ...state, approve0: action.payload }
    case UniV2DepositActionType.SET_APPROVE_1:
      return { ...state, approve1: action.payload }
    case UniV2DepositActionType.SET_DEPOSIT:
      return { ...state, deposit: { ...state.deposit, ...action.payload } }
    case UniV2DepositActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case UniV2DepositActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
