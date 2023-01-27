import type {
  OsmosisPool,
  OsmosisToken,
} from 'state/slices/opportunitiesSlice/resolvers/osmosis/utils'
import type { LpEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

type EstimatedFee = {
  estimatedFeeCrypto?: string
}

type WithdrawValues = {
  underlyingAsset0: Omit<OsmosisToken & { fiatAmount: string }, 'fiatAmount'>
  underlyingAsset1: Omit<OsmosisToken & { fiatAmount: string }, 'fiatAmount'>
  shareInAmount: string
}

type OsmosisWithdrawValues = WithdrawValues &
  EstimatedFee & {
    txStatus: string
    usedGasFee: string
  }

export type OsmosisWithdrawState = {
  opportunity: LpEarnOpportunityType | null
  poolData: Partial<OsmosisPool> | null
  userAddress: string | null
  withdraw: OsmosisWithdrawValues
  loading: boolean
  txid: string | null
}

export enum OsmosisWithdrawActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_POOL_DATA = 'SET_POOL_DATA',
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

type SetPoolData = {
  type: OsmosisWithdrawActionType.SET_POOL_DATA
  payload: OsmosisPool
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
  | SetPoolData
  | SetUserAddress
  | SetWithdraw
  | SetUserAddress
  | SetLoading
  | SetTxid
  | SetTxStatus
