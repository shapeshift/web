import type { FoxEthLpWithdrawActions, FoxEthLpWithdrawState } from './WithdrawCommon'
import { FoxEthLpWithdrawActionType } from './WithdrawCommon'

export const initialState: FoxEthLpWithdrawState = {
  txid: null,
  opportunity: null,
  userAddress: null,
  loading: false,
  approve: {},
  withdraw: {
    lpAmount: '',
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
    case FoxEthLpWithdrawActionType.SET_OPPORTUNITY:
      return { ...state, opportunity: { ...state.opportunity, ...action.payload } }
    case FoxEthLpWithdrawActionType.SET_WITHDRAW:
      return { ...state, withdraw: { ...state.withdraw, ...action.payload } }
    case FoxEthLpWithdrawActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
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
