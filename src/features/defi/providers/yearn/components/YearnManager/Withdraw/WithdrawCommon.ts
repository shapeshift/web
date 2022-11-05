import type { YearnOpportunity } from '@keepkey/investor-yearn'
import type { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type YearnWithdrawValues = WithdrawValues &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string
  }

// Redux only stores things that are serializable. Class methods are removed when put in state.
type SerializableOpportunity = Omit<
  YearnOpportunity,
  'allowance' | 'prepareApprove' | 'prepareDeposit' | 'prepareWithdrawal' | 'signAndBroadcast'
>

export type YearnWithdrawState = {
  opportunity: SerializableOpportunity | null
  userAddress: string | null
  approve: EstimatedGas
  withdraw: YearnWithdrawValues
  loading: boolean
  txid: string | null
}

export enum YearnWithdrawActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_WITHDRAW = 'SET_WITHDRAW',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS',
}

type SetOpportunityAction = {
  type: YearnWithdrawActionType.SET_OPPORTUNITY
  payload: YearnOpportunity
}

type SetWithdraw = {
  type: YearnWithdrawActionType.SET_WITHDRAW
  payload: Partial<YearnWithdrawValues>
}

type SetUserAddress = {
  type: YearnWithdrawActionType.SET_USER_ADDRESS
  payload: string
}

type SetLoading = {
  type: YearnWithdrawActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: YearnWithdrawActionType.SET_TXID
  payload: string
}

export type YearnWithdrawActions =
  | SetOpportunityAction
  | SetWithdraw
  | SetUserAddress
  | SetLoading
  | SetTxid
