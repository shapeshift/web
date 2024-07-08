import type { DepositValues, Field as DepositField } from 'features/defi/components/Deposit/Deposit'
import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

type EstimatedGas = {
  estimatedGasCryptoBaseUnit?: string
}

type CosmosDepositValues = Omit<DepositValues, DepositField.Slippage> &
  EstimatedGas & {
    txStatus: string
  }

export type CosmosDepositState = {
  apy: string
  deposit: CosmosDepositValues
  loading: boolean
  pricePerShare: string
  txid: string | null
}

export enum CosmosDepositActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_DEPOSIT = 'SET_DEPOSIT',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
}

type SetCosmosOpportunitiesAction = {
  type: CosmosDepositActionType.SET_OPPORTUNITY
  payload: StakingEarnOpportunityType['apy'] | null
}

type SetDeposit = {
  type: CosmosDepositActionType.SET_DEPOSIT
  payload: Partial<CosmosDepositValues>
}

type SetLoading = {
  type: CosmosDepositActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: CosmosDepositActionType.SET_TXID
  payload: string
}

export type CosmosDepositActions = SetCosmosOpportunitiesAction | SetDeposit | SetLoading | SetTxid
