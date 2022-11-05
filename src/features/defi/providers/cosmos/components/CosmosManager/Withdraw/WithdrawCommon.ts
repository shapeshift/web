import type { ChainId } from '@keepkey/caip'
import type { WithdrawType } from '@keepkey/types'
import type {
  Field as WithdrawField,
  WithdrawValues,
} from 'features/defi/components/Withdraw/Withdraw'
import type { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { BigNumber } from 'lib/bignumber/bignumber'
import type { MergedActiveStakingOpportunity } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'

type SupportedCosmosOpportunity = {
  type: DefiType
  provider: string
  version: string
  contractAddress: string
  stakingToken: string
  chain: ChainId
  tvl: BigNumber
  expired: boolean
}

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type CosmosWithdrawValues = Omit<WithdrawValues, WithdrawField.Slippage> &
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
  payload: MergedActiveStakingOpportunity
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
