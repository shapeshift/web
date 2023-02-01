import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type YearnWithdrawValues = WithdrawValues &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string
  }

export type YearnWithdrawState = {
  opportunity: StakingEarnOpportunityType | null
  userAddress: string | null
  approve: EstimatedGas
  withdraw: YearnWithdrawValues
  loading: boolean
  txid: string | null
}

export enum YearnWithdrawActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_WITHDRAW = 'SET_WITHDRAW',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS',
}

type SetOpportunityAction = {
  type: YearnWithdrawActionType.SET_OPPORTUNITY
  payload: StakingEarnOpportunityType
}

type SetWithdraw = {
  type: YearnWithdrawActionType.SET_WITHDRAW
  payload: Partial<YearnWithdrawValues>
}

type SetUserAddress = {
  type: YearnWithdrawActionType.SET_USER_ADDRESS
  payload: string
}

type SetLoading = {
  type: YearnWithdrawActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: YearnWithdrawActionType.SET_TXID
  payload: string
}

export type YearnWithdrawActions =
  | SetOpportunityAction
  | SetWithdraw
  | SetUserAddress
  | SetLoading
  | SetTxid
