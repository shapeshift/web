import type { FoxFarmingEarnOpportunityType } from 'context/FoxEthProvider/FoxEthProvider'

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type WithdrawValues = {
  lpAmount: string
}

type FoxFarmingWithdrawValues = WithdrawValues &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string
    isExiting: boolean
  }

export type FoxFarmingWithdrawState = {
  opportunity: FoxFarmingEarnOpportunityType | null
  userAddress: string | null
  approve: EstimatedGas
  withdraw: FoxFarmingWithdrawValues
  loading: boolean
  txid: string | null
}

export enum FoxFarmingWithdrawActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_WITHDRAW = 'SET_WITHDRAW',
  SET_LOADING = 'SET_LOADING',
  SET_APPROVE = 'SET_APPROVE',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS',
}

type SetOpportunityAction = {
  type: FoxFarmingWithdrawActionType.SET_OPPORTUNITY
  payload: FoxFarmingEarnOpportunityType
}

type SetWithdraw = {
  type: FoxFarmingWithdrawActionType.SET_WITHDRAW
  payload: Partial<FoxFarmingWithdrawValues>
}

type SetUserAddress = {
  type: FoxFarmingWithdrawActionType.SET_USER_ADDRESS
  payload: string
}

type SetLoading = {
  type: FoxFarmingWithdrawActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: FoxFarmingWithdrawActionType.SET_TXID
  payload: string
}

type SetApprove = {
  type: FoxFarmingWithdrawActionType.SET_APPROVE
  payload: EstimatedGas
}

export type FoxFarmingWithdrawActions =
  | SetOpportunityAction
  | SetWithdraw
  | SetUserAddress
  | SetApprove
  | SetLoading
  | SetTxid
