import type { IdleOpportunity } from '@keepkey/investor-idle'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'

export enum WithdrawPath {
  Withdraw = '/',
  Confirm = '/confirm',
  ConfirmSettings = '/confirm/settings',
  Status = '/status',
}

export const routes = [
  { step: 0, path: WithdrawPath.Withdraw, label: 'Amount' },
  { step: 1, path: WithdrawPath.Confirm, label: 'Confirm' },
  { path: WithdrawPath.ConfirmSettings, label: 'Confirm Settings' },
  { step: 2, path: WithdrawPath.Status, label: 'Status' },
]

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type IdleWithdrawValues = WithdrawValues &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string
  }

// Redux only stores things that are serializable. Class methods are removed when put in state.
type SerializableOpportunity = Omit<
  IdleOpportunity,
  | 'allowance'
  | 'prepareApprove'
  | 'prepareDeposit'
  | 'prepareWithdrawal'
  | 'prepareClaimTokens'
  | 'signAndBroadcast'
  | 'getClaimableTokens'
>

export type IdleWithdrawState = {
  opportunity: SerializableOpportunity | null
  userAddress: string | null
  approve: EstimatedGas
  withdraw: IdleWithdrawValues
  loading: boolean
  txid: string | null
}

export enum IdleWithdrawActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_WITHDRAW = 'SET_WITHDRAW',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS',
}

type SetOpportunityAction = {
  type: IdleWithdrawActionType.SET_OPPORTUNITY
  payload: IdleOpportunity
}

type SetWithdraw = {
  type: IdleWithdrawActionType.SET_WITHDRAW
  payload: Partial<IdleWithdrawValues>
}

type SetUserAddress = {
  type: IdleWithdrawActionType.SET_USER_ADDRESS
  payload: string
}

type SetLoading = {
  type: IdleWithdrawActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: IdleWithdrawActionType.SET_TXID
  payload: string
}

export type IdleWithdrawActions =
  | SetOpportunityAction
  | SetWithdraw
  | SetUserAddress
  | SetLoading
  | SetTxid
