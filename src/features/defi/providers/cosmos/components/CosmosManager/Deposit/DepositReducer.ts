import type { CosmosDepositActions, CosmosDepositState } from './DepositCommon'
import { CosmosDepositActionType } from './DepositCommon'

export const initialState: CosmosDepositState = {
  txid: null,
  apy: '',
  loading: false,
  pricePerShare: '',
  deposit: {
    fiatAmount: '',
    cryptoAmount: '',
    txStatus: 'pending',
  },
}

export const reducer = (
  state: CosmosDepositState,
  action: CosmosDepositActions,
): CosmosDepositState => {
  switch (action.type) {
    case CosmosDepositActionType.SET_OPPORTUNITY:
      return {
        ...state,
        apy: action.payload ?? '',
      }
    case CosmosDepositActionType.SET_DEPOSIT:
      return { ...state, deposit: { ...state.deposit, ...action.payload } }
    case CosmosDepositActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case CosmosDepositActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
