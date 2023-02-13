import type { AccountId } from '@shapeshiftoss/caip'
import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

export enum TxStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

type OsmosisStakingClaimValues = {
  estimatedGasCrypto?: string
  usedGasFee?: string
  txStatus: TxStatus
}

export type OsmosisStakingClaimState = {
  opportunity: StakingEarnOpportunityType
  accountId: AccountId | null
  claim: OsmosisStakingClaimValues
  loading: boolean
  txid: string | null
}

export enum OsmosisStakingClaimActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_ACCOUNT_ID = 'SET_ACCOUNT_ID',
  SET_CLAIM = 'SET_CLAIM',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
}

type SetOsmosisStakingOpportunitiesAction = {
  type: OsmosisStakingClaimActionType.SET_OPPORTUNITY
  payload: Partial<StakingEarnOpportunityType> | null
}

type SetClaim = {
  type: OsmosisStakingClaimActionType.SET_CLAIM
  payload: Partial<OsmosisStakingClaimValues>
}

type SetAccountId = {
  type: OsmosisStakingClaimActionType.SET_ACCOUNT_ID
  payload: AccountId
}

type SetLoading = {
  type: OsmosisStakingClaimActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: OsmosisStakingClaimActionType.SET_TXID
  payload: string | null
}

export type OsmosisStakingClaimActions =
  | SetOsmosisStakingOpportunitiesAction
  | SetClaim
  | SetAccountId
  | SetLoading
  | SetTxid
