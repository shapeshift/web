import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type IdleWithdrawValues = WithdrawValues &
  EstimatedGas & {
    txStatus: string
    usedGasFeeCryptoBaseUnit: string
  }

export type IdleWithdrawState = {
  opportunity: StakingEarnOpportunityType | undefined
  approve: EstimatedGas
  withdraw: IdleWithdrawValues
  loading: boolean
  txid: string | undefined
}

export enum IdleWithdrawActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_WITHDRAW = 'SET_WITHDRAW',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS',
}

type SetOpportunityAction = {
  type: IdleWithdrawActionType.SET_OPPORTUNITY
  payload: StakingEarnOpportunityType
}

type SetWithdraw = {
  type: IdleWithdrawActionType.SET_WITHDRAW
  payload: Partial<IdleWithdrawValues>
}

type SetLoading = {
  type: IdleWithdrawActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: IdleWithdrawActionType.SET_TXID
  payload: string
}

export type IdleWithdrawActions = SetOpportunityAction | SetWithdraw | SetLoading | SetTxid
