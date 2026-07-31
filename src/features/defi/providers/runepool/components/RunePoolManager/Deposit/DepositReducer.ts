import type { RunePoolDepositActions, RunePoolDepositState } from './DepositCommon'
import { RunePoolDepositActionType } from './DepositCommon'

export const initialState: RunePoolDepositState = {
  txid: null,
  opportunity: null,
  loading: false,
  deposit: {
    fiatAmount: '',
    cryptoAmount: '',
    slippage: '',
    txStatus: 'pending',
    networkFeeCryptoBaseUnit: '',
  },
}

export const reducer = (
  state: RunePoolDepositState,
  action: RunePoolDepositActions,
): RunePoolDepositState => {
  switch (action.type) {
    case RunePoolDepositActionType.SET_OPPORTUNITY:
      return { ...state, opportunity: { ...state.opportunity, ...action.payload } }
    case RunePoolDepositActionType.SET_DEPOSIT:
      return { ...state, deposit: { ...state.deposit, ...action.payload } }
    case RunePoolDepositActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case RunePoolDepositActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
