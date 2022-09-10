import type { MergedActiveStakingOpportunity } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'

export enum TxStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

type CosmosClaimValues = {
  estimatedGasCrypto?: string
  usedGasFee?: string
  txStatus: TxStatus
}

export type CosmosClaimState = {
  opportunity: MergedActiveStakingOpportunity
  userAddress: string | null
  claim: CosmosClaimValues
  loading: boolean
  txid: string | null
}

export enum CosmosClaimActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_CLAIM = 'SET_CLAIM',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
}

type SetCosmosOpportunitiesAction = {
  type: CosmosClaimActionType.SET_OPPORTUNITY
  payload: Partial<MergedActiveStakingOpportunity> | null
}

type SetClaim = {
  type: CosmosClaimActionType.SET_CLAIM
  payload: Partial<CosmosClaimValues>
}

type SetUserAddress = {
  type: CosmosClaimActionType.SET_USER_ADDRESS
  payload: string
}

type SetLoading = {
  type: CosmosClaimActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: CosmosClaimActionType.SET_TXID
  payload: string | null
}

export type CosmosClaimActions =
  | SetCosmosOpportunitiesAction
  | SetClaim
  | SetUserAddress
  | SetLoading
  | SetTxid
