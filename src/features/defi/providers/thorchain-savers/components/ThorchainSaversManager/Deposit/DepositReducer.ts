import type { ThorchainSaversDepositActions, ThorchainSaversDepositState } from './DepositCommon'
import { ThorchainSaversDepositActionType } from './DepositCommon'

export const initialState: ThorchainSaversDepositState = {
  txid: null,
  opportunity: null,
  loading: false,
  isExactAllowance: false,
  approve: {},
  deposit: {
    fiatAmount: '',
    cryptoAmount: '',
    slippage: '',
    txStatus: 'pending',
    protocolFeeCryptoBaseUnit: '',
    networkFeeCryptoBaseUnit: '',
    maybeFromUTXOAccountAddress: '',
  },
}

export const reducer = (
  state: ThorchainSaversDepositState,
  action: ThorchainSaversDepositActions,
): ThorchainSaversDepositState => {
  switch (action.type) {
    case ThorchainSaversDepositActionType.SET_OPPORTUNITY:
      return { ...state, opportunity: { ...state.opportunity, ...action.payload } }
    case ThorchainSaversDepositActionType.SET_APPROVE:
      return { ...state, approve: action.payload }
    case ThorchainSaversDepositActionType.SET_DEPOSIT:
      return { ...state, deposit: { ...state.deposit, ...action.payload } }
    case ThorchainSaversDepositActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case ThorchainSaversDepositActionType.SET_IS_EXACT_ALLOWANCE:
      return { ...state, isExactAllowance: action.payload }
    case ThorchainSaversDepositActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
