import type { YearnOpportunity } from '@keepkey/investor-yearn'
import type { DepositValues } from 'features/defi/components/Deposit/Deposit'

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type YearnDepositValues = DepositValues &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string
  }

// Redux only stores things that are serializable. Class methods are removed when put in state.
export type SerializableOpportunity = Omit<
  YearnOpportunity,
  'allowance' | 'prepareApprove' | 'prepareDeposit' | 'prepareWithdrawal' | 'signAndBroadcast'
>

export type YearnDepositState = {
  opportunity: SerializableOpportunity | null
  userAddress: string | null
  approve: EstimatedGas
  isExactAllowance?: boolean
  deposit: YearnDepositValues
  loading: boolean
  txid: string | null
}

export enum YearnDepositActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_APPROVE = 'SET_APPROVE',
  SET_IS_EXACT_ALLOWANCE = 'SET_IS_EXACT_ALLOWANCE',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_DEPOSIT = 'SET_DEPOSIT',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
}

type SetOpportunityAction = {
  type: YearnDepositActionType.SET_OPPORTUNITY
  payload: YearnOpportunity
}

type SetApprove = {
  type: YearnDepositActionType.SET_APPROVE
  payload: EstimatedGas
}

type SetIsExactAllowance = {
  type: YearnDepositActionType.SET_IS_EXACT_ALLOWANCE
  payload: boolean
}

type SetDeposit = {
  type: YearnDepositActionType.SET_DEPOSIT
  payload: Partial<YearnDepositValues>
}

type SetUserAddress = {
  type: YearnDepositActionType.SET_USER_ADDRESS
  payload: string
}

type SetLoading = {
  type: YearnDepositActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: YearnDepositActionType.SET_TXID
  payload: string
}

export type YearnDepositActions =
  | SetOpportunityAction
  | SetApprove
  | SetDeposit
  | SetUserAddress
  | SetLoading
  | SetTxid
  | SetIsExactAllowance
