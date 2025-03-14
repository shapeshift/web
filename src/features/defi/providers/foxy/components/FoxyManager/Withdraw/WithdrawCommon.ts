import type { ChainId } from '@shapeshiftoss/caip'
import type { WithdrawType } from '@shapeshiftoss/types'

import type { WithdrawValues } from '@/features/defi/components/Withdraw/Withdraw'
import type { BigNumber } from '@/lib/bignumber/bignumber'
import type { DefiType } from '@/state/slices/opportunitiesSlice/types'

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
  estimatedGasCryptoBaseUnit?: string
}

type FoxyWithdrawValues = WithdrawValues &
  EstimatedGas & {
    txStatus: string
    usedGasFeeCryptoBaseUnit: string
    withdrawType: WithdrawType
  }

export type FoxyWithdrawState = {
  foxyOpportunity: SupportedFoxyOpportunity
  approve: EstimatedGas
  withdraw: FoxyWithdrawValues
  loading: boolean
  txid: string | null
  foxyFeePercentage: string
}
export enum FoxyWithdrawActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
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
  | SetLoading
  | SetTxid
  | SetFoxyFee
