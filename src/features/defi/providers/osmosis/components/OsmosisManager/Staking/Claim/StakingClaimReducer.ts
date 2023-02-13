import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

import type { OsmosisStakingClaimActions, OsmosisStakingClaimState } from './StakingClaimCommon'
import { OsmosisStakingClaimActionType, TxStatus } from './StakingClaimCommon'

export const initialState: OsmosisStakingClaimState = {
  txid: null,
  opportunity: {} as StakingEarnOpportunityType,
  accountId: null,
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
    case OsmosisStakingClaimActionType.SET_ACCOUNT_ID:
      return { ...state, accountId: action.payload }
    case OsmosisStakingClaimActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case OsmosisStakingClaimActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
