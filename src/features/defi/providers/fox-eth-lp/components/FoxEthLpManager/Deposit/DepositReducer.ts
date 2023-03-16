import type { FoxEthLpDepositActions, FoxEthLpDepositState } from './DepositCommon'
import { FoxEthLpDepositActionType } from './DepositCommon'

export const initialState: FoxEthLpDepositState = {
  txid: null,
  loading: false,
  approve: {},
  deposit: {
    foxFiatAmount: '',
    foxCryptoAmount: '',
    ethFiatAmount: '',
    ethCryptoAmount: '',
    txStatus: 'pending',
    usedGasFeeCryptoPrecision: '',
  },
}

export const reducer = (
  state: FoxEthLpDepositState,
  action: FoxEthLpDepositActions,
): FoxEthLpDepositState => {
  switch (action.type) {
    case FoxEthLpDepositActionType.SET_APPROVE:
      return { ...state, approve: action.payload }
    case FoxEthLpDepositActionType.SET_DEPOSIT:
      return { ...state, deposit: { ...state.deposit, ...action.payload } }
    case FoxEthLpDepositActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case FoxEthLpDepositActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
