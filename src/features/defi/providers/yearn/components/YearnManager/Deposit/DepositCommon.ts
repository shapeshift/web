import { SupportedYearnVault, YearnVault } from '@shapeshiftoss/investor-yearn'
import { DepositValues } from 'features/defi/components/Deposit/Deposit'

export enum DepositPath {
  Deposit = '/',
  Approve = '/approve',
  ApproveSettings = '/approve/settings',
  Confirm = '/confirm',
  ConfirmSettings = '/confirm/settings',
  Status = '/status',
}

export const routes = [
  { step: 0, path: DepositPath.Deposit, label: 'Deposit' },
  { step: 1, path: DepositPath.Approve, label: 'Approve' },
  { path: DepositPath.ApproveSettings, label: 'Approve Settings' },
  { step: 2, path: DepositPath.Confirm, label: 'Confirm' },
  { path: DepositPath.ConfirmSettings, label: 'Confirm Settings' },
  { step: 3, path: DepositPath.Status, label: 'Status' },
]

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type YearnDepositValues = DepositValues &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string
  }

export type YearnDepositState = {
  vault: SupportedYearnVault
  userAddress: string | null
  approve: EstimatedGas
  deposit: YearnDepositValues
  loading: boolean
  pricePerShare: string
  txid: string | null
}

export enum YearnDepositActionType {
  SET_VAULT = 'SET_VAULT',
  SET_APPROVE = 'SET_APPROVE',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_DEPOSIT = 'SET_DEPOSIT',
  SET_LOADING = 'SET_LOADING',
  SET_PRICE_PER_SHARE = 'SET_PRICE_PER_SHARE',
  SET_TXID = 'SET_TXID',
}

type SetVaultAction = {
  type: YearnDepositActionType.SET_VAULT
  payload: YearnVault | null
}

type SetApprove = {
  type: YearnDepositActionType.SET_APPROVE
  payload: EstimatedGas
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

type SetPricePerShare = {
  type: YearnDepositActionType.SET_PRICE_PER_SHARE
  payload: string
}

type SetTxid = {
  type: YearnDepositActionType.SET_TXID
  payload: string
}

export type YearnDepositActions =
  | SetVaultAction
  | SetApprove
  | SetDeposit
  | SetUserAddress
  | SetLoading
  | SetPricePerShare
  | SetTxid
