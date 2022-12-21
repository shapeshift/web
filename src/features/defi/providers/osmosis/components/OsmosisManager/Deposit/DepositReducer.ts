import type { OsmosisDepositActions, OsmosisDepositState } from './DepositCommon'
import { OsmosisDepositActionType } from './DepositCommon'

export const initialState: OsmosisDepositState = {
  txid: null,
  opportunity: null,
  userAddress: null,
  loading: false,
  isExactAllowance: false,
  approve: {},
  deposit: {
    fiatAmount: '',
    cryptoAmount: '',
    slippage: '',
    txStatus: 'pending',
    usedGasFee: '',
  },
}

export const reducer = (
  state: OsmosisDepositState,
  action: OsmosisDepositActions,
): OsmosisDepositState => {
  switch (action.type) {
    case OsmosisDepositActionType.SET_OPPORTUNITY:
      return { ...state, opportunity: { ...state.opportunity, ...action.payload } }
    case OsmosisDepositActionType.SET_APPROVE:
      return { ...state, approve: action.payload }
    case OsmosisDepositActionType.SET_DEPOSIT:
      return { ...state, deposit: { ...state.deposit, ...action.payload } }
    case OsmosisDepositActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case OsmosisDepositActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case OsmosisDepositActionType.SET_IS_EXACT_ALLOWANCE:
      return { ...state, isExactAllowance: action.payload }
    case OsmosisDepositActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
