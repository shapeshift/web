import type { DepositValues, Field as DepositField } from 'features/defi/components/Deposit/Deposit'
import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type CosmosDepositValues = Omit<DepositValues, DepositField.Slippage> &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string // TODO: remove this property?
  }

export type CosmosDepositState = {
  cosmosOpportunity: { apr: string }
  userAddress: string | null
  deposit: CosmosDepositValues
  loading: boolean
  pricePerShare: string
  txid: string | null
}

export enum CosmosDepositActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_DEPOSIT = 'SET_DEPOSIT',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
}

type SetCosmosOpportunitiesAction = {
  type: CosmosDepositActionType.SET_OPPORTUNITY
  payload: Partial<StakingEarnOpportunityType> | null
}

type SetDeposit = {
  type: CosmosDepositActionType.SET_DEPOSIT
  payload: Partial<CosmosDepositValues>
}

type SetUserAddress = {
  type: CosmosDepositActionType.SET_USER_ADDRESS
  payload: string
}

type SetLoading = {
  type: CosmosDepositActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: CosmosDepositActionType.SET_TXID
  payload: string
}

export type CosmosDepositActions =
  | SetCosmosOpportunitiesAction
  | SetDeposit
  | SetUserAddress
  | SetLoading
  | SetTxid
