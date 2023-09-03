import type { ThorchainSaversWithdrawActions, ThorchainSaversWithdrawState } from './WithdrawCommon'
import { ThorchainSaversWithdrawActionType } from './WithdrawCommon'

export const initialState: ThorchainSaversWithdrawState = {
  txid: null,
  opportunity: null,
  loading: false,
  approve: {},
  isExactAllowance: false,
  withdraw: {
    fiatAmount: '',
    cryptoAmount: '',
    slippage: '',
    txStatus: 'pending',
    dustAmountCryptoBaseUnit: '',
    protocolFeeCryptoBaseUnit: '',
    networkFeeCryptoBaseUnit: '',
    maybeFromUTXOAccountAddress: '',
  },
}

export const reducer = (
  state: ThorchainSaversWithdrawState,
  action: ThorchainSaversWithdrawActions,
): ThorchainSaversWithdrawState => {
  switch (action.type) {
    case ThorchainSaversWithdrawActionType.SET_IS_EXACT_ALLOWANCE:
      return { ...state, isExactAllowance: action.payload }
    case ThorchainSaversWithdrawActionType.SET_APPROVE:
      return { ...state, approve: action.payload }
    case ThorchainSaversWithdrawActionType.SET_OPPORTUNITY:
      return { ...state, opportunity: { ...state.opportunity, ...action.payload } }
    case ThorchainSaversWithdrawActionType.SET_WITHDRAW:
      return { ...state, withdraw: { ...state.withdraw, ...action.payload } }
    case ThorchainSaversWithdrawActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case ThorchainSaversWithdrawActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
