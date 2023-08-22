import type { OsmosisDepositActions, OsmosisDepositState } from './LpDepositCommon'
import { OsmosisDepositActionType } from './LpDepositCommon'

export const initialState: OsmosisDepositState = {
  txid: null,
  opportunity: null,
  poolData: null,
  accountId: null,
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
    estimatedFeeCryptoBaseUnit: '',
    shareOutAmountBaseUnit: '',
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
    case OsmosisDepositActionType.SET_ACCOUNT_ID:
      return { ...state, accountId: action.payload }
    case OsmosisDepositActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case OsmosisDepositActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
