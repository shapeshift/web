import type {
  Field as WithdrawField,
  WithdrawValues,
} from 'features/defi/components/Withdraw/Withdraw'
import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type CosmosWithdrawValues = Omit<WithdrawValues, WithdrawField.Slippage> &
  EstimatedGas & {
    txStatus: string
  }

export type CosmosWithdrawState = {
  withdraw: CosmosWithdrawValues
  loading: boolean
  txid: string | null
}
export enum CosmosWithdrawActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_WITHDRAW = 'SET_WITHDRAW',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS',
}

type SetVaultAction = {
  type: CosmosWithdrawActionType.SET_OPPORTUNITY
  payload: Partial<StakingEarnOpportunityType> | null
}

type SetWithdraw = {
  type: CosmosWithdrawActionType.SET_WITHDRAW
  payload: Partial<CosmosWithdrawValues>
}

type SetLoading = {
  type: CosmosWithdrawActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: CosmosWithdrawActionType.SET_TXID
  payload: string
}

export type CosmosWithdrawActions = SetVaultAction | SetWithdraw | SetLoading | SetTxid
