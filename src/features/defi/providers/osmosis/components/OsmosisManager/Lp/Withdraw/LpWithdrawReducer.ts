import type { OsmosisWithdrawActions, OsmosisWithdrawState } from './LpWithdrawCommon'
import { OsmosisWithdrawActionType } from './LpWithdrawCommon'

export const initialState: OsmosisWithdrawState = {
  txid: null,
  opportunity: null,
  accountId: null,
  loading: false,
  withdraw: {
    underlyingAsset0: {
      amount: '',
      denom: '',
    },
    underlyingAsset1: {
      amount: '',
      denom: '',
    },
    estimatedFeeCryptoBaseUnit: '',
    shareInAmountBaseUnit: '',
    txStatus: 'pending',
    usedGasFee: '',
  },
}

export const reducer = (
  state: OsmosisWithdrawState,
  action: OsmosisWithdrawActions,
): OsmosisWithdrawState => {
  switch (action.type) {
    case OsmosisWithdrawActionType.SET_OPPORTUNITY:
      return { ...state, opportunity: { ...state.opportunity, ...action.payload } }
    case OsmosisWithdrawActionType.SET_WITHDRAW:
      return { ...state, withdraw: { ...state.withdraw, ...action.payload } }
    case OsmosisWithdrawActionType.SET_ACCOUNT_ID:
      return { ...state, accountId: action.payload }
    case OsmosisWithdrawActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case OsmosisWithdrawActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
