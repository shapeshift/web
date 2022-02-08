import { SupportedYearnVault, YearnVault } from '@shapeshiftoss/investor-yearn'
import { ChainTypes } from '@shapeshiftoss/types'
import { DepositValues } from 'features/defi/components/Deposit/Deposit'

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type YearnDepositValues = DepositValues &
  EstimatedGas & {
    txStatus: string
    usedGasFee: string
  }

type YearnDepositState = {
  vault: SupportedYearnVault
  userAddress: string | null
  approve: EstimatedGas
  deposit: YearnDepositValues
  loading: boolean
  pricePerShare: string
  txid: string | null
}

export const initialState: YearnDepositState = {
  txid: null,
  vault: {
    vaultAddress: '',
    tokenAddress: '',
    provider: '',
    chain: ChainTypes.Ethereum,
    type: '',
    expired: false,
    address: '',
    typeId: 'VAULT_V2',
    token: '',
    name: '',
    version: '',
    symbol: '',
    decimals: '',
    tokenId: '',
    underlyingTokenBalance: {
      amount: '0',
      amountUsdc: '0'
    },
    metadata: {
      symbol: '',
      pricePerShare: '',
      migrationAvailable: false,
      latestVaultAddress: '',
      depositLimit: '',
      emergencyShutdown: false,
      controller: '',
      totalAssets: '',
      totalSupply: '',
      displayName: '',
      displayIcon: '',
      defaultDisplayToken: '',
      hideIfNoDeposits: false
    }
  },
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

export enum YearnDepositActionType {
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
    case YearnDepositActionType.SET_VAULT:
      return { ...state, vault: { ...state.vault, ...action.payload } }
    case YearnDepositActionType.SET_APPROVE:
      return { ...state, approve: action.payload }
    case YearnDepositActionType.SET_DEPOSIT:
      return { ...state, deposit: { ...state.deposit, ...action.payload } }
    case YearnDepositActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case YearnDepositActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case YearnDepositActionType.SET_PRICE_PER_SHARE:
      return { ...state, pricePerShare: action.payload }
    case YearnDepositActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
