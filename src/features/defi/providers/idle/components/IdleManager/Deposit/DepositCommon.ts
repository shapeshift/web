import type { IdleOpportunity } from '@shapeshiftoss/investor-idle'
import type { DepositValues } from 'features/defi/components/Deposit/Deposit'
import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

export enum DepositPath {
  Deposit = '/',
  Approve = '/approve',
  ApproveSettings = '/approve/settings',
  Confirm = '/confirm',
  ConfirmSettings = '/confirm/settings',
  Status = '/status',
}

export const routes = [
  { step: 0, path: DepositPath.Deposit, label: 'Deposit' },
  { step: 1, path: DepositPath.Approve, label: 'Approve' },
  { path: DepositPath.ApproveSettings, label: 'Approve Settings' },
  { step: 2, path: DepositPath.Confirm, label: 'Confirm' },
  { path: DepositPath.ConfirmSettings, label: 'Confirm Settings' },
  { step: 3, path: DepositPath.Status, label: 'Status' },
]

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type IdleDepositValues = DepositValues &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string
  }

// Redux only stores things that are serializable. Class methods are removed when put in state.
export type SerializableOpportunity = Omit<
  IdleOpportunity,
  | 'allowance'
  | 'prepareApprove'
  | 'prepareDeposit'
  | 'signAndBroadcast'
  | 'prepareWithdrawal'
  | 'prepareClaimTokens'
  | 'getClaimableTokens'
  | 'getRewardAssetIds'
>

export type IdleDepositState = {
  opportunity: StakingEarnOpportunityType | undefined
  approve: EstimatedGas
  deposit: IdleDepositValues
  loading: boolean
  txid: string | undefined
}

export enum IdleDepositActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_APPROVE = 'SET_APPROVE',
  SET_DEPOSIT = 'SET_DEPOSIT',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
}

type SetOpportunityAction = {
  type: IdleDepositActionType.SET_OPPORTUNITY
  payload: StakingEarnOpportunityType
}

type SetApprove = {
  type: IdleDepositActionType.SET_APPROVE
  payload: EstimatedGas
}

type SetDeposit = {
  type: IdleDepositActionType.SET_DEPOSIT
  payload: Partial<IdleDepositValues>
}

type SetLoading = {
  type: IdleDepositActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: IdleDepositActionType.SET_TXID
  payload: string
}

export type IdleDepositActions =
  | SetOpportunityAction
  | SetApprove
  | SetDeposit
  | SetLoading
  | SetTxid
