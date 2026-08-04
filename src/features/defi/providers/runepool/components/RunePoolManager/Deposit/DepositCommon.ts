import type { DepositValues } from '@/features/defi/components/Deposit/Deposit'
import type { StakingEarnOpportunityType } from '@/state/slices/opportunitiesSlice/types'

type RunePoolDepositValues = DepositValues & {
  txStatus: string
  networkFeeCryptoBaseUnit: string
  estimatedGasCryptoPrecision?: string
  sendMax?: boolean
}

export type RunePoolDepositState = {
  opportunity: StakingEarnOpportunityType | null
  deposit: RunePoolDepositValues
  loading: boolean
  txid: string | null
}

export enum RunePoolDepositActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_DEPOSIT = 'SET_DEPOSIT',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
}

type SetOpportunityAction = {
  type: RunePoolDepositActionType.SET_OPPORTUNITY
  payload: StakingEarnOpportunityType
}

type SetDeposit = {
  type: RunePoolDepositActionType.SET_DEPOSIT
  payload: Partial<RunePoolDepositValues>
}

type SetLoading = {
  type: RunePoolDepositActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: RunePoolDepositActionType.SET_TXID
  payload: string
}

export type RunePoolDepositActions = SetOpportunityAction | SetDeposit | SetLoading | SetTxid
