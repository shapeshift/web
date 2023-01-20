import type { ThorchainSaversWithdrawActions, ThorchainSaversWithdrawState } from './WithdrawCommon'
import { ThorchainSaversWithdrawActionType } from './WithdrawCommon'

export const initialState: ThorchainSaversWithdrawState = {
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
    dustAmountCryptoPrecision: '',
    withdrawFeeCryptoBaseUnit: '',
  },
}

export const reducer = (
  state: ThorchainSaversWithdrawState,
  action: ThorchainSaversWithdrawActions,
): ThorchainSaversWithdrawState => {
  switch (action.type) {
    case ThorchainSaversWithdrawActionType.SET_OPPORTUNITY:
      return { ...state, opportunity: { ...state.opportunity, ...action.payload } }
    case ThorchainSaversWithdrawActionType.SET_WITHDRAW:
      return { ...state, withdraw: { ...state.withdraw, ...action.payload } }
    case ThorchainSaversWithdrawActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case ThorchainSaversWithdrawActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case ThorchainSaversWithdrawActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
