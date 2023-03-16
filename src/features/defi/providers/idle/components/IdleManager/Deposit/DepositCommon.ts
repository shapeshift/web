import type { DepositValues } from 'features/defi/components/Deposit/Deposit'
import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

type EstimatedGas = {
  estimatedGasCryptoBaseUnit?: string
}

type IdleDepositValues = DepositValues &
  EstimatedGas & {
    txStatus: string
    usedGasFeeCryptoBaseUnit: string
  }

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
