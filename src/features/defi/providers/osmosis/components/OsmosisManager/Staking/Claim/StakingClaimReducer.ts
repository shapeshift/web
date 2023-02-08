import type { MergedActiveStakingOpportunity } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'

import type { OsmosisStakingClaimActions, OsmosisStakingClaimState } from './StakingClaimCommon'
import { OsmosisStakingClaimActionType, TxStatus } from './StakingClaimCommon'

export const initialState: OsmosisStakingClaimState = {
  txid: null,
  opportunity: {} as MergedActiveStakingOpportunity,
  userAddress: null,
  loading: false,
  claim: {
    usedGasFee: '',
    txStatus: TxStatus.PENDING,
  },
}

export const reducer = (
  state: OsmosisStakingClaimState,
  action: OsmosisStakingClaimActions,
): OsmosisStakingClaimState => {
  switch (action.type) {
    case OsmosisStakingClaimActionType.SET_OPPORTUNITY:
      return {
        ...state,
        opportunity: {
          ...state.opportunity,
          ...action.payload,
        },
      }
    case OsmosisStakingClaimActionType.SET_CLAIM:
      return { ...state, claim: { ...state.claim, ...action.payload } }
    case OsmosisStakingClaimActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case OsmosisStakingClaimActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case OsmosisStakingClaimActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
