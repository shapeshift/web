import type { AccountId } from '@shapeshiftoss/caip'
import type {
  OsmosisPool,
  OsmosisToken,
} from 'state/slices/opportunitiesSlice/resolvers/osmosis/utils'
import type { LpEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

type EstimatedFee = {
  estimatedFeeCryptoBaseUnit?: string
}

type DepositValues = {
  underlyingAsset0: OsmosisToken
  underlyingAsset1: OsmosisToken
  shareOutAmountBaseUnit: string
}

type OsmosisDepositValues = DepositValues &
  EstimatedFee & {
    txStatus: string
    usedGasFee: string
  }

export type OsmosisDepositState = {
  opportunity: LpEarnOpportunityType | null
  poolData: Partial<OsmosisPool> | null
  accountId: AccountId | null
  deposit: OsmosisDepositValues
  loading: boolean
  txid: string | null
}

export enum OsmosisDepositActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_POOL_DATA = 'SET_POOL_DATA',
  SET_ACCOUNT_ID = 'SET_ACCOUNT_ID',
  SET_DEPOSIT = 'SET_DEPOSIT',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS',
}

type SetOpportunityAction = {
  type: OsmosisDepositActionType.SET_OPPORTUNITY
  payload: LpEarnOpportunityType
}

type SetPoolData = {
  type: OsmosisDepositActionType.SET_POOL_DATA
  payload: OsmosisPool | null
}

type SetDeposit = {
  type: OsmosisDepositActionType.SET_DEPOSIT
  payload: Partial<OsmosisDepositValues>
}

type SetAccountId = {
  type: OsmosisDepositActionType.SET_ACCOUNT_ID
  payload: AccountId | null
}

type SetLoading = {
  type: OsmosisDepositActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: OsmosisDepositActionType.SET_TXID
  payload: string
}

type SetTxStatus = {
  type: OsmosisDepositActionType.SET_TX_STATUS
  payload: string
}

export type OsmosisDepositActions =
  | SetOpportunityAction
  | SetPoolData
  | SetDeposit
  | SetAccountId
  | SetLoading
  | SetTxid
  | SetTxStatus
