import type { OsmosisOpportunity } from '@shapeshiftoss/investor-osmosis'
import type { DepositValues } from 'features/defi/components/Deposit/Deposit'

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type OsmosisDepositValues = DepositValues &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string
  }

// Redux only stores things that are serializable. Class methods are removed when put in state.
export type SerializableOpportunity = Omit<
  OsmosisOpportunity,
  'allowance' | 'prepareApprove' | 'prepareDeposit' | 'prepareWithdrawal' | 'signAndBroadcast'
>

export type OsmosisDepositState = {
  opportunity: SerializableOpportunity | null
  userAddress: string | null
  approve: EstimatedGas
  isExactAllowance?: boolean
  deposit: OsmosisDepositValues
  loading: boolean
  txid: string | null
}

export enum OsmosisDepositActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_APPROVE = 'SET_APPROVE',
  SET_IS_EXACT_ALLOWANCE = 'SET_IS_EXACT_ALLOWANCE',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_DEPOSIT = 'SET_DEPOSIT',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
}

type SetOpportunityAction = {
  type: OsmosisDepositActionType.SET_OPPORTUNITY
  payload: OsmosisOpportunity
}

type SetApprove = {
  type: OsmosisDepositActionType.SET_APPROVE
  payload: EstimatedGas
}

type SetIsExactAllowance = {
  type: OsmosisDepositActionType.SET_IS_EXACT_ALLOWANCE
  payload: boolean
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

export type OsmosisDepositActions =
  | SetOpportunityAction
  | SetApprove
  | SetDeposit
  | SetUserAddress
  | SetLoading
  | SetTxid
  | SetIsExactAllowance
