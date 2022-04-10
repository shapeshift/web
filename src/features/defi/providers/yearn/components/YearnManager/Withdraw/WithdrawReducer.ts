import { SupportedYearnVault, YearnVault } from '@shapeshiftoss/investor-yearn'
import { ChainTypes, WithdrawType } from '@shapeshiftoss/types'
import { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'

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

export const initialState: YearnWithdrawState = {
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
      amountUsdc: '0',
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
      hideIfNoDeposits: false,
    },
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
    usedGasFee: '',
    withdrawType: WithdrawType.INSTANT,
  },
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

export const reducer = (state: YearnWithdrawState, action: YearnWithdrawActions) => {
  switch (action.type) {
    case YearnWithdrawActionType.SET_VAULT:
      return { ...state, vault: { ...state.vault, ...action.payload } }
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
