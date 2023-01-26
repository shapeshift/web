import type {
  OsmosisPool,
  OsmosisToken,
} from 'state/slices/opportunitiesSlice/resolvers/osmosis/utils'
import type { LpEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

type EstimatedFee = {
  estimatedFeeCrypto?: string
}

type DepositValues = {
  underlyingAsset0: OsmosisToken & { fiatAmount: string }
  underlyingAsset1: OsmosisToken & { fiatAmount: string }
  shareOutAmount: string
}

type OsmosisDepositValues = DepositValues &
  EstimatedFee & {
    txStatus: string
    usedGasFee: string
  }

export type OsmosisDepositState = {
  opportunity: LpEarnOpportunityType | null
  poolData: Partial<OsmosisPool> | null
  userAddress: string | null
  deposit: OsmosisDepositValues
  loading: boolean
  txid: string | null
}

export enum OsmosisDepositActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_POOL_DATA = 'SET_POOL_DATA',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
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

type SetUserAddress = {
  type: OsmosisDepositActionType.SET_USER_ADDRESS
  payload: string
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
  | SetUserAddress
  | SetLoading
  | SetTxid
  | SetTxStatus
