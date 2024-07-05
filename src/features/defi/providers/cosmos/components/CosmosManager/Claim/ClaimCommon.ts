import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

export enum TxStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

type CosmosClaimValues = {
  estimatedGasCryptoBaseUnit?: string
  txStatus: TxStatus
}

export type CosmosClaimState = {
  opportunity: StakingEarnOpportunityType
  claim: CosmosClaimValues
  loading: boolean
  txid: string | null
}

export enum CosmosClaimActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_CLAIM = 'SET_CLAIM',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
}

type SetCosmosOpportunitiesAction = {
  type: CosmosClaimActionType.SET_OPPORTUNITY
  payload: Partial<StakingEarnOpportunityType> | null
}

type SetClaim = {
  type: CosmosClaimActionType.SET_CLAIM
  payload: Partial<CosmosClaimValues>
}

type SetLoading = {
  type: CosmosClaimActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: CosmosClaimActionType.SET_TXID
  payload: string | null
}

export type CosmosClaimActions = SetCosmosOpportunitiesAction | SetClaim | SetLoading | SetTxid
