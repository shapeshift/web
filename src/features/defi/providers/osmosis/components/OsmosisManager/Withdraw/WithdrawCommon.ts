import type { OsmosisToken } from 'state/slices/opportunitiesSlice/resolvers/osmosis/utils'
import type { LpEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

type EstimatedFee = {
  estimatedFeeCrypto?: string
}

type WithdrawValues = {
  underlyingAsset0: OsmosisToken
  underlyingAsset1: OsmosisToken
  shareInAmount: string
}

type OsmosisWithdrawValues = WithdrawValues &
  EstimatedFee & {
    txStatus: string
    usedGasFee: string
  }

export type OsmosisWithdrawState = {
  opportunity: LpEarnOpportunityType | null
  userAddress: string | null
  withdraw: OsmosisWithdrawValues
  loading: boolean
  txid: string | null
}

export enum OsmosisWithdrawActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_WITHDRAW = 'SET_WITHDRAW',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS',
}

type SetOpportunityAction = {
  type: OsmosisWithdrawActionType.SET_OPPORTUNITY
  payload: LpEarnOpportunityType
}

type SetUserAddress = {
  type: OsmosisWithdrawActionType.SET_USER_ADDRESS
  payload: string
}

type SetWithdraw = {
  type: OsmosisWithdrawActionType.SET_WITHDRAW
  payload: Partial<OsmosisWithdrawValues>
}

type SetLoading = {
  type: OsmosisWithdrawActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: OsmosisWithdrawActionType.SET_TXID
  payload: string
}

type SetTxStatus = {
  type: OsmosisWithdrawActionType.SET_TX_STATUS
  payload: string
}

export type OsmosisWithdrawActions =
  | SetOpportunityAction
  | SetUserAddress
  | SetWithdraw
  | SetUserAddress
  | SetLoading
  | SetTxid
  | SetTxStatus
