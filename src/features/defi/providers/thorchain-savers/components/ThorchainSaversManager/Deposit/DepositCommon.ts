import type { YearnOpportunity } from '@shapeshiftoss/investor-yearn'
import type { DepositValues } from 'features/defi/components/Deposit/Deposit'
import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type ThorchainSaversDepositValues = DepositValues &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string
    depositFeeCryptoBaseUnit: string
    maybeFromUTXOAccountAddress: string
  }

// Redux only stores things that are serializable. Class methods are removed when put in state.
export type SerializableOpportunity = Omit<
  YearnOpportunity,
  'allowance' | 'prepareApprove' | 'prepareDeposit' | 'prepareWithdrawal' | 'signAndBroadcast'
>

export type ThorchainSaversDepositState = {
  opportunity: StakingEarnOpportunityType | null
  userAddress: string | null
  approve: EstimatedGas
  isExactAllowance?: boolean
  deposit: ThorchainSaversDepositValues
  loading: boolean
  txid: string | null
}

export enum ThorchainSaversDepositActionType {
  SET_OPPORTUNITY = 'SET_OPPORTUNITY',
  SET_APPROVE = 'SET_APPROVE',
  SET_IS_EXACT_ALLOWANCE = 'SET_IS_EXACT_ALLOWANCE',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_DEPOSIT = 'SET_DEPOSIT',
  SET_LOADING = 'SET_LOADING',
  SET_TXID = 'SET_TXID',
}

type SetOpportunityAction = {
  type: ThorchainSaversDepositActionType.SET_OPPORTUNITY
  payload: StakingEarnOpportunityType
}

type SetApprove = {
  type: ThorchainSaversDepositActionType.SET_APPROVE
  payload: EstimatedGas
}

type SetIsExactAllowance = {
  type: ThorchainSaversDepositActionType.SET_IS_EXACT_ALLOWANCE
  payload: boolean
}

type SetDeposit = {
  type: ThorchainSaversDepositActionType.SET_DEPOSIT
  payload: Partial<ThorchainSaversDepositValues>
}

type SetUserAddress = {
  type: ThorchainSaversDepositActionType.SET_USER_ADDRESS
  payload: string
}

type SetLoading = {
  type: ThorchainSaversDepositActionType.SET_LOADING
  payload: boolean
}

type SetTxid = {
  type: ThorchainSaversDepositActionType.SET_TXID
  payload: string
}

export type ThorchainSaversDepositActions =
  | SetOpportunityAction
  | SetApprove
  | SetDeposit
  | SetUserAddress
  | SetLoading
  | SetTxid
  | SetIsExactAllowance
