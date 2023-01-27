import type { OsmosisWithdrawActions, OsmosisWithdrawState } from './WithdrawCommon'
import { OsmosisWithdrawActionType } from './WithdrawCommon'

export const initialState: OsmosisWithdrawState = {
  txid: null,
  opportunity: null,
  poolData: null,
  userAddress: null,
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
    estimatedFeeCrypto: '',
    shareInAmount: '',
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
    case OsmosisWithdrawActionType.SET_POOL_DATA:
      return { ...state, poolData: { ...state.poolData, ...action.payload } }
    case OsmosisWithdrawActionType.SET_WITHDRAW:
      return { ...state, withdraw: { ...state.withdraw, ...action.payload } }
    case OsmosisWithdrawActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case OsmosisWithdrawActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case OsmosisWithdrawActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
