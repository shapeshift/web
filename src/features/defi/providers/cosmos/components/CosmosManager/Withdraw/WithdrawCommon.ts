import { ChainId } from '@shapeshiftoss/caip'
import { WithdrawType } from '@shapeshiftoss/types'
import { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { BigNumber } from 'lib/bignumber/bignumber'
import { MergedActiveStakingOpportunity } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'

export enum WithdrawPath {
  Withdraw = '/',
  Confirm = '/confirm',
  ConfirmSettings = '/confirm/settings',
  Status = '/status',
}

export const routes = [
  { step: 0, path: WithdrawPath.Withdraw, label: 'Amount' },
  { step: 1, path: WithdrawPath.Confirm, label: 'Confirm' },
  { path: WithdrawPath.ConfirmSettings, label: 'Confirm Settings' },
  { step: 2, path: WithdrawPath.Status, label: 'Status' },
]

type SupportedCosmosOpportunity = {
  type: DefiType
  provider: string
  version: string
  contractAddress: string
  stakingToken: string
  chain: ChainId
  tvl: BigNumber
  apy: string
  expired: boolean
}

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type CosmosWithdrawValues = WithdrawValues &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string
    withdrawType: WithdrawType
  }

export type CosmosWithdrawState = {
  cosmosOpportunity: SupportedCosmosOpportunity
  userAddress: string | null
  withdraw: CosmosWithdrawValues
  loading: boolean
  txid: string | null
}
export enum CosmosWithdrawActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_WITHDRAW = 'SET_WITHDRAW',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS',
}

type SetVaultAction = {
  type: CosmosWithdrawActionType.SET_OPPORTUNITY
  payload: (MergedActiveStakingOpportunity & { apy: string }) | null
}

type SetWithdraw = {
  type: CosmosWithdrawActionType.SET_WITHDRAW
  payload: Partial<CosmosWithdrawValues>
}

type SetUserAddress = {
  type: CosmosWithdrawActionType.SET_USER_ADDRESS
  payload: string
}

type SetLoading = {
  type: CosmosWithdrawActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: CosmosWithdrawActionType.SET_TXID
  payload: string
}

export type CosmosWithdrawActions =
  | SetVaultAction
  | SetWithdraw
  | SetUserAddress
  | SetLoading
  | SetTxid
