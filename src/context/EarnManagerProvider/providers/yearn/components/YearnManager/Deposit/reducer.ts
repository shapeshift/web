import { DepositValues } from 'context/EarnManagerProvider/components/Deposit/Deposit'

import { YearnVault } from '../../../api/api'

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type YearnDepositValues = DepositValues &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string
  }

type YearnDepositState = {
  vault: YearnVault
  userAddress: string | null
  approve: EstimatedGas
  deposit: YearnDepositValues
  loading: boolean
  pricePerShare: string
  txid: string | null
}

export const initialState: YearnDepositState = {
  txid: null,
  vault: { apy: { net_apy: 0 } } as YearnVault,
  userAddress: null,
  loading: false,
  approve: {},
  pricePerShare: '',
  deposit: {
    fiatAmount: '',
    cryptoAmount: '',
    slippage: '',
    txStatus: 'pending',
    usedGasFee: ''
  }
}

export enum YearnActionType {
  SET_VAULT = 'SET_VAULT',
  SET_APPROVE = 'SET_APPROVE',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_DEPOSIT = 'SET_DEPOSIT',
  SET_LOADING = 'SET_LOADING',
  SET_PRICE_PER_SHARE = 'SET_PRICE_PER_SHARE',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS'
}

type SetVaultAction = {
  type: YearnActionType.SET_VAULT
  payload: YearnVault
}

type SetApprove = {
  type: YearnActionType.SET_APPROVE
  payload: EstimatedGas
}

type SetDeposit = {
  type: YearnActionType.SET_DEPOSIT
  payload: Partial<YearnDepositValues>
}

type SetUserAddress = {
  type: YearnActionType.SET_USER_ADDRESS
  payload: string
}

type SetLoading = {
  type: YearnActionType.SET_LOADING
  payload: boolean
}

type SetPricePerShare = {
  type: YearnActionType.SET_PRICE_PER_SHARE
  payload: string
}

type SetTxid = {
  type: YearnActionType.SET_TXID
  payload: string
}

type YearnDepositActions =
  | SetVaultAction
  | SetApprove
  | SetDeposit
  | SetUserAddress
  | SetLoading
  | SetPricePerShare
  | SetTxid

export const reducer = (state: YearnDepositState, action: YearnDepositActions) => {
  switch (action.type) {
    case YearnActionType.SET_VAULT:
      return { ...state, vault: { ...state.vault, ...action.payload } }
    case YearnActionType.SET_APPROVE:
      return { ...state, approve: action.payload }
    case YearnActionType.SET_DEPOSIT:
      return { ...state, deposit: { ...state.deposit, ...action.payload } }
    case YearnActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case YearnActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case YearnActionType.SET_PRICE_PER_SHARE:
      return { ...state, pricePerShare: action.payload }
    case YearnActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
