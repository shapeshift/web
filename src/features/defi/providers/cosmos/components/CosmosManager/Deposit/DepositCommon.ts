import { ChainId } from '@shapeshiftoss/caip'
import { DepositValues } from 'features/defi/components/Deposit/Deposit'
import { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { BigNumber } from 'lib/bignumber/bignumber'
import { MergedActiveStakingOpportunity } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'

export enum DepositPath {
  Deposit = '/',
  Confirm = '/confirm',
  ConfirmSettings = '/confirm/settings',
  Status = '/status',
}

export const routes = [
  { step: 0, path: DepositPath.Deposit, label: 'Deposit' },
  { step: 1, path: DepositPath.Confirm, label: 'Confirm' },
  { path: DepositPath.ConfirmSettings, label: 'Confirm Settings' },
  { step: 2, path: DepositPath.Status, label: 'Status' },
]

type SupportedCosmosOpportunity = {
  type: DefiType
  provider: string
  version: string
  stakingToken: string
  chain: ChainId
  tvl: BigNumber
  apy: string
  expired: boolean
}

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type CosmosDepositValues = DepositValues &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string // TODO: remove this property?
  }

export type CosmosDepositState = {
  cosmosOpportunity: SupportedCosmosOpportunity
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
  payload: Partial<MergedActiveStakingOpportunity> | null
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
