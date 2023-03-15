import type { AccountId } from '@shapeshiftoss/caip'
import type { OsmosisToken } from 'state/slices/opportunitiesSlice/resolvers/osmosis/utils'
import type { LpEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

type EstimatedFee = {
  estimatedFeeCryptoBaseUnit?: string
}

type WithdrawValues = {
  underlyingAsset0: OsmosisToken
  underlyingAsset1: OsmosisToken
  shareInAmountBaseUnit: string
}

type OsmosisWithdrawValues = WithdrawValues &
  EstimatedFee & {
    txStatus: string
    usedGasFee: string
  }

export type OsmosisWithdrawState = {
  opportunity: LpEarnOpportunityType | null
  accountId: AccountId | null
  withdraw: OsmosisWithdrawValues
  loading: boolean
  txid: string | null
}

export enum OsmosisWithdrawActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_ACCOUNT_ID = 'SET_ACCOUNT_ID',
  SET_WITHDRAW = 'SET_WITHDRAW',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS',
}

type SetOpportunityAction = {
  type: OsmosisWithdrawActionType.SET_OPPORTUNITY
  payload: LpEarnOpportunityType
}

type SetAccountId = {
  type: OsmosisWithdrawActionType.SET_ACCOUNT_ID
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
  | SetAccountId
  | SetWithdraw
  | SetLoading
  | SetTxid
  | SetTxStatus
