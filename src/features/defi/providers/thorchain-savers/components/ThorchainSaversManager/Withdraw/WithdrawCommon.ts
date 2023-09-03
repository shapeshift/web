import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

type EstimatedGas = {
  estimatedGasCryptoBaseUnit?: string
}

type ThorchainSaversWithdrawValues = WithdrawValues &
  EstimatedGas & {
    txStatus: string
    dustAmountCryptoBaseUnit: string
    networkFeeCryptoBaseUnit: string
    protocolFeeCryptoBaseUnit: string
    maybeFromUTXOAccountAddress: string
  }

export type ThorchainSaversWithdrawState = {
  opportunity: StakingEarnOpportunityType | null
  approve: EstimatedGas
  withdraw: ThorchainSaversWithdrawValues
  loading: boolean
  txid: string | null
  isExactAllowance?: boolean
}

export enum ThorchainSaversWithdrawActionType {
  SET_APPROVE = 'SET_APPROVE',
  SET_IS_EXACT_ALLOWANCE = 'SET_IS_EXACT_ALLOWANCE',
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_WITHDRAW = 'SET_WITHDRAW',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS',
}

type SetOpportunityAction = {
  type: ThorchainSaversWithdrawActionType.SET_OPPORTUNITY
  payload: StakingEarnOpportunityType
}

type SetApprove = {
  type: ThorchainSaversWithdrawActionType.SET_APPROVE
  payload: EstimatedGas
}

type SetIsExactAllowance = {
  type: ThorchainSaversWithdrawActionType.SET_IS_EXACT_ALLOWANCE
  payload: boolean
}

type SetWithdraw = {
  type: ThorchainSaversWithdrawActionType.SET_WITHDRAW
  payload: Partial<ThorchainSaversWithdrawValues>
}

type SetLoading = {
  type: ThorchainSaversWithdrawActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: ThorchainSaversWithdrawActionType.SET_TXID
  payload: string
}

export type ThorchainSaversWithdrawActions =
  | SetOpportunityAction
  | SetWithdraw
  | SetLoading
  | SetTxid
  | SetApprove
  | SetIsExactAllowance
