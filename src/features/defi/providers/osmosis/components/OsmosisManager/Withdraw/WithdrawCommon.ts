import type { OsmosisOpportunity } from '@shapeshiftoss/investor-osmosis'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type OsmosisWithdrawValues = WithdrawValues &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string
  }

// Redux only stores things that are serializable. Class methods are removed when put in state.
type SerializableOpportunity = Omit<
  OsmosisOpportunity,
  'allowance' | 'prepareApprove' | 'prepareDeposit' | 'prepareWithdrawal' | 'signAndBroadcast'
>

export type OsmosisWithdrawState = {
  opportunity: SerializableOpportunity | null
  userAddress: string | null
  approve: EstimatedGas
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
  payload: OsmosisOpportunity
}

type SetWithdraw = {
  type: OsmosisWithdrawActionType.SET_WITHDRAW
  payload: Partial<OsmosisWithdrawValues>
}

type SetUserAddress = {
  type: OsmosisWithdrawActionType.SET_USER_ADDRESS
  payload: string
}

type SetLoading = {
  type: OsmosisWithdrawActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: OsmosisWithdrawActionType.SET_TXID
  payload: string
}

export type OsmosisWithdrawActions =
  | SetOpportunityAction
  | SetWithdraw
  | SetUserAddress
  | SetLoading
  | SetTxid
