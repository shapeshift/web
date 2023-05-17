import type { IdleOpportunity } from 'lib/investor/investor-idle'

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type IdleClaimValues = EstimatedGas & {
  txStatus: string
  usedGasFee: string
}

export type IdleClaimState = {
  approve: EstimatedGas
  claim: IdleClaimValues
  loading: boolean
  txid: string | undefined
}

export enum IdleClaimActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_CLAIM = 'SET_CLAIM',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS',
}

type SetOpportunityAction = {
  type: IdleClaimActionType.SET_OPPORTUNITY
  payload: IdleOpportunity
}

type SetClaim = {
  type: IdleClaimActionType.SET_CLAIM
  payload: Partial<IdleClaimValues>
}

type SetLoading = {
  type: IdleClaimActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: IdleClaimActionType.SET_TXID
  payload: string
}

export type IdleClaimActions = SetOpportunityAction | SetLoading | SetClaim | SetTxid
