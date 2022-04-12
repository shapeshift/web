import { SupportedYearnVault, YearnVault } from '@shapeshiftoss/investor-yearn'
import { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'

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

type YearnWithdrawValues = WithdrawValues &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string
  }

export type YearnWithdrawState = {
  vault: SupportedYearnVault
  userAddress: string | null
  approve: EstimatedGas
  withdraw: YearnWithdrawValues
  loading: boolean
  pricePerShare: string
  txid: string | null
}

export enum YearnWithdrawActionType {
  SET_VAULT = 'SET_VAULT',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_WITHDRAW = 'SET_WITHDRAW',
  SET_LOADING = 'SET_LOADING',
  SET_PRICE_PER_SHARE = 'SET_PRICE_PER_SHARE',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS',
}

type SetVaultAction = {
  type: YearnWithdrawActionType.SET_VAULT
  payload: YearnVault | null
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

type SetPricePerShare = {
  type: YearnWithdrawActionType.SET_PRICE_PER_SHARE
  payload: string
}

type SetTxid = {
  type: YearnWithdrawActionType.SET_TXID
  payload: string
}

export type YearnWithdrawActions =
  | SetVaultAction
  | SetWithdraw
  | SetUserAddress
  | SetLoading
  | SetPricePerShare
  | SetTxid
