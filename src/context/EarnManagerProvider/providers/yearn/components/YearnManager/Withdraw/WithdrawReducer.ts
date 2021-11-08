import { WithdrawValues } from 'context/EarnManagerProvider/components/Withdraw/Withdraw'

import { YearnVault } from '../../../api/api'

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type YearnWithdrawValues = WithdrawValues &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string
  }

type YearnWithdrawState = {
  vault: YearnVault
  userAddress: string | null
  approve: EstimatedGas
  withdraw: YearnWithdrawValues
  loading: boolean
  pricePerShare: string
  txid: string | null
}

export const initialState: YearnWithdrawState = {
  txid: null,
  vault: {
    inception: 0,
    address: '',
    symbol: '',
    name: '',
    display_name: '',
    icon: '',
    token: {
      name: '',
      symbol: '',
      address: '',
      decimals: 0,
      display_name: '',
      icon: ''
    },
    tvl: {
      total_assets: 0,
      price: 0,
      tvl: 0
    },
    apy: {
      net_apy: 0
    },
    endorsed: false,
    version: '',
    decimals: 0,
    type: '',
    emergency_shutdown: false
  },
  userAddress: null,
  loading: false,
  approve: {},
  pricePerShare: '',
  withdraw: {
    fiatAmount: '',
    cryptoAmount: '',
    slippage: '',
    txStatus: 'pending',
    usedGasFee: ''
  }
}

export enum YearnWithdrawActionType {
  SET_VAULT = 'SET_VAULT',
  // SET_APPROVE = 'SET_APPROVE',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_WITHDRAW = 'SET_WITHDRAW',
  SET_LOADING = 'SET_LOADING',
  SET_PRICE_PER_SHARE = 'SET_PRICE_PER_SHARE',
  SET_TXID = 'SET_TXID',
  SET_TX_STATUS = 'SET_TX_STATUS'
}

type SetVaultAction = {
  type: YearnWithdrawActionType.SET_VAULT
  payload: YearnVault
}

// type SetApprove = {
//   type: YearnWithdrawActionType.SET_APPROVE
//   payload: EstimatedGas
// }

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

type YearnWithdrawActions =
  | SetVaultAction
  // | SetApprove
  | SetWithdraw
  | SetUserAddress
  | SetLoading
  | SetPricePerShare
  | SetTxid

export const reducer = (state: YearnWithdrawState, action: YearnWithdrawActions) => {
  switch (action.type) {
    case YearnWithdrawActionType.SET_VAULT:
      return { ...state, vault: { ...state.vault, ...action.payload } }
    // case YearnWithdrawActionType.SET_APPROVE:
    //   return { ...state, approve: action.payload }
    case YearnWithdrawActionType.SET_WITHDRAW:
      return { ...state, withdraw: { ...state.withdraw, ...action.payload } }
    case YearnWithdrawActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case YearnWithdrawActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case YearnWithdrawActionType.SET_PRICE_PER_SHARE:
      return { ...state, pricePerShare: action.payload }
    case YearnWithdrawActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
