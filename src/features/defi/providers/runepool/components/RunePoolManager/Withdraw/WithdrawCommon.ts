import type { WithdrawValues } from '@/features/defi/components/Withdraw/Withdraw'
import type { StakingEarnOpportunityType } from '@/state/slices/opportunitiesSlice/types'

type RunePoolWithdrawValues = WithdrawValues & {
  txStatus: string
  estimatedGasCryptoBaseUnit?: string
  networkFeeCryptoBaseUnit: string
}

export type RunePoolWithdrawState = {
  opportunity: StakingEarnOpportunityType | null
  withdraw: RunePoolWithdrawValues
  loading: boolean
  txid: string | null
}

export enum RunePoolWithdrawActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_WITHDRAW = 'SET_WITHDRAW',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
}

type SetOpportunityAction = {
  type: RunePoolWithdrawActionType.SET_OPPORTUNITY
  payload: StakingEarnOpportunityType
}

type SetWithdraw = {
  type: RunePoolWithdrawActionType.SET_WITHDRAW
  payload: Partial<RunePoolWithdrawValues>
}

type SetLoading = {
  type: RunePoolWithdrawActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: RunePoolWithdrawActionType.SET_TXID
  payload: string
}

export type RunePoolWithdrawActions = SetOpportunityAction | SetWithdraw | SetLoading | SetTxid
