import type { DepositValues } from 'features/defi/components/Deposit/Deposit'
import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

type EstimatedGas = {
  estimatedGasCryptoPrecision?: string
}

type ThorchainSaversDepositValues = DepositValues &
  EstimatedGas & {
    txStatus: string
    networkFeeCryptoBaseUnit: string
    protocolFeeCryptoBaseUnit: string
    maybeFromUTXOAccountAddress: string
    sendMax?: boolean
  }

export type ThorchainSaversDepositState = {
  opportunity: StakingEarnOpportunityType | null
  approve: EstimatedGas
  isExactAllowance?: boolean
  deposit: ThorchainSaversDepositValues
  loading: boolean
  txid: string | null
}

export enum ThorchainSaversDepositActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_APPROVE = 'SET_APPROVE',
  SET_IS_EXACT_ALLOWANCE = 'SET_IS_EXACT_ALLOWANCE',
  SET_DEPOSIT = 'SET_DEPOSIT',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
}

type SetOpportunityAction = {
  type: ThorchainSaversDepositActionType.SET_OPPORTUNITY
  payload: StakingEarnOpportunityType
}

type SetApprove = {
  type: ThorchainSaversDepositActionType.SET_APPROVE
  payload: EstimatedGas
}

type SetIsExactAllowance = {
  type: ThorchainSaversDepositActionType.SET_IS_EXACT_ALLOWANCE
  payload: boolean
}

type SetDeposit = {
  type: ThorchainSaversDepositActionType.SET_DEPOSIT
  payload: Partial<ThorchainSaversDepositValues>
}

type SetLoading = {
  type: ThorchainSaversDepositActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: ThorchainSaversDepositActionType.SET_TXID
  payload: string
}

export type ThorchainSaversDepositActions =
  | SetOpportunityAction
  | SetApprove
  | SetDeposit
  | SetLoading
  | SetTxid
  | SetIsExactAllowance

export const DEPOSIT_MEMO = 'POOL+'
