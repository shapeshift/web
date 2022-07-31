import { ChainId } from '@shapeshiftoss/caip'
import { DefiType } from '@shapeshiftoss/investor-foxy'
import { DepositValues } from 'features/defi/components/Deposit/Deposit'
import { BigNumber } from 'lib/bignumber/bignumber'

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
}

export enum FoxyDepositActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_APPROVE = 'SET_APPROVE',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_DEPOSIT = 'SET_DEPOSIT',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
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

export type FoxyDepositActions =
  | SetFoxyOpportunitiesAction
  | SetApprove
  | SetDeposit
  | SetUserAddress
  | SetLoading
  | SetTxid
