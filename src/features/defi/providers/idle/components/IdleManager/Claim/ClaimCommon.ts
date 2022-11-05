import type { ClaimableToken, IdleOpportunity } from '@keepkey/investor-idle'

export enum ClaimPath {
  Claim = '/',
  Confirm = '/confirm',
  Status = '/status',
}

export const routes = [
  { step: 0, path: ClaimPath.Confirm, label: 'Confirm' },
  { step: 1, path: ClaimPath.Status, label: 'Status' },
]

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type IdleClaimValues = EstimatedGas & {
  txStatus: string
  usedGasFee: string
}

// Redux only stores things that are serializable. Class methods are removed when put in state.
type SerializableOpportunity = Omit<
  IdleOpportunity,
  | 'allowance'
  | 'prepareApprove'
  | 'prepareDeposit'
  | 'prepareWithdrawal'
  | 'prepareClaimTokens'
  | 'signAndBroadcast'
  | 'getClaimableTokens'
>

export type IdleClaimState = {
  opportunity: SerializableOpportunity | null
  userAddress: string | null
  approve: EstimatedGas
  claim: IdleClaimValues
  claimableTokens: ClaimableToken[]
  loading: boolean
  txid: string | null
}

export enum IdleClaimActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_CLAIM = 'SET_CLAIM',
  SET_CLAIMABLE_TOKENS = 'SET_CLAIMABLE_TOKENS',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS',
}

type SetOpportunityAction = {
  type: IdleClaimActionType.SET_OPPORTUNITY
  payload: IdleOpportunity
}

type SetUserAddress = {
  type: IdleClaimActionType.SET_USER_ADDRESS
  payload: string
}

type SetClaim = {
  type: IdleClaimActionType.SET_CLAIM
  payload: Partial<IdleClaimValues>
}

type SetClaimableTokens = {
  type: IdleClaimActionType.SET_CLAIMABLE_TOKENS
  payload: ClaimableToken[]
}

type SetLoading = {
  type: IdleClaimActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: IdleClaimActionType.SET_TXID
  payload: string
}

export type IdleClaimActions =
  | SetOpportunityAction
  | SetClaimableTokens
  | SetUserAddress
  | SetLoading
  | SetClaim
  | SetTxid
