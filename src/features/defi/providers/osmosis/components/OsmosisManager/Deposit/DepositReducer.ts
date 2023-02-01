import type { OsmosisDepositActions, OsmosisDepositState } from './DepositCommon'
import { OsmosisDepositActionType } from './DepositCommon'

export const initialState: OsmosisDepositState = {
  txid: null,
  opportunity: null,
  poolData: null,
  userAddress: null,
  loading: false,
  deposit: {
    underlyingAsset0: {
      amount: '',
      denom: '',
    },
    underlyingAsset1: {
      amount: '',
      denom: '',
    },
    estimatedFeeCrypto: '',
    shareOutAmount: '',
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
    case OsmosisDepositActionType.SET_POOL_DATA:
      return { ...state, poolData: { ...state.poolData, ...action.payload } }
    case OsmosisDepositActionType.SET_DEPOSIT:
      return { ...state, deposit: { ...state.deposit, ...action.payload } }
    case OsmosisDepositActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case OsmosisDepositActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case OsmosisDepositActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
