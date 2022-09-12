import type { IdleClaimActions, IdleClaimState } from './ClaimCommon'
import { IdleClaimActionType } from './ClaimCommon'

export const initialState: IdleClaimState = {
  txid: null,
  opportunity: null,
  userAddress: null,
  loading: false,
  approve: {},
  claimableTokens: [],
  claim: {
    txStatus: 'pending',
    usedGasFee: '',
  },
}

export const reducer = (state: IdleClaimState, action: IdleClaimActions): IdleClaimState => {
  switch (action.type) {
    case IdleClaimActionType.SET_OPPORTUNITY:
      return { ...state, opportunity: { ...state.opportunity, ...action.payload } }
    case IdleClaimActionType.SET_CLAIMABLE_TOKENS:
      return { ...state, claimableTokens: action.payload }
    case IdleClaimActionType.SET_CLAIM:
      return { ...state, claim: { ...state.claim, ...action.payload } }
    case IdleClaimActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case IdleClaimActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case IdleClaimActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
