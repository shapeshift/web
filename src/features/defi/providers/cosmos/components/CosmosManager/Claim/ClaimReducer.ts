import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

import type { CosmosClaimActions, CosmosClaimState } from './ClaimCommon'
import { CosmosClaimActionType, TxStatus } from './ClaimCommon'

export const initialState: CosmosClaimState = {
  txid: null,
  opportunity: {} as StakingEarnOpportunityType,
  loading: false,
  claim: {
    txStatus: TxStatus.PENDING,
  },
}

export const reducer = (state: CosmosClaimState, action: CosmosClaimActions): CosmosClaimState => {
  switch (action.type) {
    case CosmosClaimActionType.SET_OPPORTUNITY:
      return {
        ...state,
        opportunity: {
          ...state.opportunity,
          ...action.payload,
        },
      }
    case CosmosClaimActionType.SET_CLAIM:
      return { ...state, claim: { ...state.claim, ...action.payload } }
    case CosmosClaimActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case CosmosClaimActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
