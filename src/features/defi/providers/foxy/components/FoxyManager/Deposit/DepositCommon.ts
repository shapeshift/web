import type { ChainId } from '@keepkey/caip'
import type { DefiType } from '@keepkey/investor-foxy'
import type { DepositValues } from 'features/defi/components/Deposit/Deposit'
import type { BigNumber } from 'lib/bignumber/bignumber'

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

type FoxyDepositValues = DepositValues &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string
  }

export type FoxyDepositState = {
  foxyOpportunity: SupportedFoxyOpportunity
  userAddress: string | null
  approve: EstimatedGas
  deposit: FoxyDepositValues
  loading: boolean
  pricePerShare: string
  txid: string | null
  isExactAllowance: boolean
}

export enum FoxyDepositActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_APPROVE = 'SET_APPROVE',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_DEPOSIT = 'SET_DEPOSIT',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
  SET_IS_EXACT_ALLOWANCE = 'SET_IS_EXACT_ALLOWANCE',
}

type SetFoxyOpportunitiesAction = {
  type: FoxyDepositActionType.SET_OPPORTUNITY
  payload: SupportedFoxyOpportunity | null
}

type SetApprove = {
  type: FoxyDepositActionType.SET_APPROVE
  payload: EstimatedGas
}

type SetDeposit = {
  type: FoxyDepositActionType.SET_DEPOSIT
  payload: Partial<FoxyDepositValues>
}

type SetUserAddress = {
  type: FoxyDepositActionType.SET_USER_ADDRESS
  payload: string
}

type SetLoading = {
  type: FoxyDepositActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: FoxyDepositActionType.SET_TXID
  payload: string
}

type SetIsExactAllowance = {
  type: FoxyDepositActionType.SET_IS_EXACT_ALLOWANCE
  payload: boolean
}

export type FoxyDepositActions =
  | SetFoxyOpportunitiesAction
  | SetApprove
  | SetDeposit
  | SetUserAddress
  | SetLoading
  | SetTxid
  | SetIsExactAllowance
