import type { FoxEthLpWithdrawActions, FoxEthLpWithdrawState } from './WithdrawCommon'
import { FoxEthLpWithdrawActionType } from './WithdrawCommon'

export const initialState: FoxEthLpWithdrawState = {
  txid: null,
  loading: false,
  approve: {},
  withdraw: {
    lpAmount: '',
    lpFiatAmount: '',
    foxAmount: '',
    ethAmount: '',
    txStatus: 'pending',
    usedGasFee: '',
  },
}

export const reducer = (
  state: FoxEthLpWithdrawState,
  action: FoxEthLpWithdrawActions,
): FoxEthLpWithdrawState => {
  switch (action.type) {
    case FoxEthLpWithdrawActionType.SET_WITHDRAW:
      return { ...state, withdraw: { ...state.withdraw, ...action.payload } }
    case FoxEthLpWithdrawActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case FoxEthLpWithdrawActionType.SET_APPROVE:
      return { ...state, approve: action.payload }
    case FoxEthLpWithdrawActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
