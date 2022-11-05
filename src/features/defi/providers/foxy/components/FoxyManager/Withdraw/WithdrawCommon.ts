import type { ChainId } from '@keepkey/caip'
import type { DefiType } from '@keepkey/investor-foxy'
import type { WithdrawType } from '@keepkey/types'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import type { BigNumber } from 'lib/bignumber/bignumber'

export enum WithdrawPath {
  Withdraw = '/',
  Approve = '/approve',
  Confirm = '/confirm',
  ConfirmSettings = '/confirm/settings',
  Status = '/status',
}

export const routes = [
  { step: 0, path: WithdrawPath.Withdraw, label: 'Amount' },
  { step: 1, path: WithdrawPath.Approve, label: 'Approve' },
  { step: 2, path: WithdrawPath.Confirm, label: 'Confirm' },
  { path: WithdrawPath.ConfirmSettings, label: 'Confirm Settings' },
  { step: 3, path: WithdrawPath.Status, label: 'Status' },
]

type SupportedFoxyOpportunity = {
  type: DefiType
  provider: string
  version: string
  contractAddress: string
  rewardToken: string
  stakingToken: string
  chain: ChainId
  tvl: BigNumber
  apy: string
  expired: boolean
}

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type FoxyWithdrawValues = WithdrawValues &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string
    withdrawType: WithdrawType
  }

export type FoxyWithdrawState = {
  foxyOpportunity: SupportedFoxyOpportunity
  userAddress: string | null
  approve: EstimatedGas
  withdraw: FoxyWithdrawValues
  loading: boolean
  txid: string | null
  foxyFeePercentage: string
}
export enum FoxyWithdrawActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_WITHDRAW = 'SET_WITHDRAW',
  SET_APPROVE = 'SET_APPROVE',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS',
  SET_FOXY_FEE = 'SET_FOXY_FEE',
}

type SetVaultAction = {
  type: FoxyWithdrawActionType.SET_OPPORTUNITY
  payload: SupportedFoxyOpportunity | null
}

type SetApprove = {
  type: FoxyWithdrawActionType.SET_APPROVE
  payload: EstimatedGas
}

type SetWithdraw = {
  type: FoxyWithdrawActionType.SET_WITHDRAW
  payload: Partial<FoxyWithdrawValues>
}

type SetUserAddress = {
  type: FoxyWithdrawActionType.SET_USER_ADDRESS
  payload: string
}

type SetLoading = {
  type: FoxyWithdrawActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: FoxyWithdrawActionType.SET_TXID
  payload: string
}

type SetFoxyFee = {
  type: FoxyWithdrawActionType.SET_FOXY_FEE
  payload: string
}

export type FoxyWithdrawActions =
  | SetVaultAction
  | SetApprove
  | SetWithdraw
  | SetUserAddress
  | SetLoading
  | SetTxid
  | SetFoxyFee
